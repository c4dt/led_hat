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

use crate::hat::{function::FormulaStrings, switch::HatState};

mod hat;

#[derive(Debug, Deserialize, Serialize)]
pub enum AdminCommand {
    Countdown(u128),
    Icon(String),
}

#[derive(Debug, Deserialize, Serialize)]
struct AdminRequest {
    secret: String,
    command: AdminCommand,
}

type SharedHat = Arc<Mutex<hat::switch::Switch>>;

#[derive(Clone)]
struct AppState {
    hat: SharedHat,
}

#[tokio::main]
async fn main() {
    let shared_hat: SharedHat = Arc::new(Mutex::new(hat::switch::Switch::new(300, 37)));

    let app_state = AppState { hat: shared_hat };

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

async fn get_leds(State(state): State<AppState>) -> String {
    let mut hat = state.hat.lock().await;
    hat.get_leds()
}

async fn set_formulas(
    State(state): State<AppState>,
    Json(payload): Json<FormulaStrings>,
) -> StatusCode {
    let mut hat = state.hat.lock().await;
    hat.add_formula(payload);

    StatusCode::OK
}

async fn admin(State(state): State<AppState>, Json(payload): Json<AdminRequest>) -> StatusCode {
    const ADMIN_SECRET: &str = "admin123";

    if payload.secret != ADMIN_SECRET {
        println!("Admin access denied: invalid secret");
        return StatusCode::UNAUTHORIZED;
    }

    println!("Admin command: {:?}", payload.command);

    let mut hat = state.hat.lock().await;

    match payload.command {
        AdminCommand::Countdown(_) => hat.set_state(HatState::Countdown),
        AdminCommand::Icon(_) => hat.set_state(HatState::Icon),
    }

    StatusCode::OK
}
