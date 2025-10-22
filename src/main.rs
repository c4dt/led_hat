use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::ServeDir;

mod hat;

#[derive(Debug, Serialize, Deserialize)]
struct LedData {
    leds: Vec<[u8; 3]>,
}

#[derive(Debug, Deserialize)]
struct FormulaRequest {
    formulas: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct AdminRequest {
    secret: String,
    command: String,
    args: Vec<String>,
}

type FormulaQueue = Arc<Mutex<Vec<String>>>;
type SharedHat = Arc<Mutex<hat::Hat>>;

#[derive(Clone)]
struct AppState {
    formula_queue: FormulaQueue,
    hat: SharedHat,
}

#[tokio::main]
async fn main() {
    let formula_queue: FormulaQueue = Arc::new(Mutex::new(Vec::new()));
    let shared_hat: SharedHat = Arc::new(Mutex::new(hat::Hat::new(200)));

    let app_state = AppState {
        formula_queue,
        hat: shared_hat,
    };

    let app = Router::new()
        .route("/api/get_leds", get(get_leds))
        .route("/api/set_formulas", post(set_formulas))
        .route("/api/admin", post(admin))
        .nest_service("/", ServeDir::new("html"))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("Server running on http://0.0.0.0:8080");

    axum::serve(listener, app).await.unwrap();
}

async fn get_leds(State(state): State<AppState>) -> Json<LedData> {
    let mut hat = state.hat.lock().await;
    let led_string = hat.get_leds();

    let dummy_leds = vec![[255, 0, 0]; 20];
    Json(LedData { leds: dummy_leds })
}

async fn set_formulas(
    State(state): State<AppState>,
    Json(payload): Json<FormulaRequest>,
) -> StatusCode {
    let mut queue = state.formula_queue.lock().await;
    queue.extend(payload.formulas);
    println!("Added formulas to queue: {:?}", queue);

    let mut hat = state.hat.lock().await;

    StatusCode::OK
}

async fn admin(State(state): State<AppState>, Json(payload): Json<AdminRequest>) -> StatusCode {
    const ADMIN_SECRET: &str = "admin123";

    if payload.secret != ADMIN_SECRET {
        println!("Admin access denied: invalid secret");
        return StatusCode::UNAUTHORIZED;
    }

    println!(
        "Admin command: {} with args: {:?}",
        payload.command, payload.args
    );

    let mut hat = state.hat.lock().await;

    match payload.command.as_str() {
        "reset" => {
            println!("Executing reset command");
        }
        "status" => {
            println!("Executing status command");
        }
        "shutdown" => {
            println!("Executing shutdown command");
        }
        _ => {
            println!("Unknown admin command: {}", payload.command);
            return StatusCode::BAD_REQUEST;
        }
    }

    StatusCode::OK
}
