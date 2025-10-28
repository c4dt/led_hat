use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};
use tokio::sync::Mutex;
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
    let file_appender = tracing_appender::rolling::daily("./logs", "led-hat.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout))
        .init();

    let shared_hat: SharedHat = Arc::new(Mutex::new(hat::switch::Switch::new(300, 37)));

    let app_state = AppState { hat: shared_hat };

    let app = Router::new()
        .route("/api/get_leds", get(get_leds))
        .route("/api/get_status", get(get_status))
        .route("/api/set_formulas", post(set_formulas))
        .route("/api/admin", post(admin))
        .nest_service("/", ServeDir::new("html"))
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("Server running on http://0.0.0.0:8080");

    axum::serve(listener, app).await.unwrap();
}

async fn get_leds(State(state): State<AppState>) -> String {
    let mut hat = state.hat.lock().await;
    hat.get_leds()
}

async fn get_status(State(state): State<AppState>) -> String {
    let hat = state.hat.lock().await;
    hat.get_status()
}

async fn set_formulas(
    State(state): State<AppState>,
    Json(payload): Json<FormulaStrings>,
) -> StatusCode {
    tracing::info!("Got new formulas: {payload:?}");
    let mut hat = state.hat.lock().await;
    hat.add_formula(payload);

    StatusCode::OK
}

async fn admin(State(state): State<AppState>, Json(payload): Json<AdminRequest>) -> StatusCode {
    let admin_secret: String = env::var("LEDHAT_ADMIN")
        .ok()
        .unwrap_or_else(|| "".to_string());

    if admin_secret.is_empty() || payload.secret != admin_secret {
        tracing::warn!("Admin access denied: invalid secret");
        return StatusCode::UNAUTHORIZED;
    }

    tracing::info!("Admin command: {:?}", payload.command);

    let mut hat = state.hat.lock().await;

    match payload.command {
        AdminCommand::Countdown(_) => hat.set_state(HatState::Countdown),
        AdminCommand::Icon(_) => hat.set_state(HatState::Icon),
    }

    StatusCode::OK
}
