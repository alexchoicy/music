use std::str::FromStr;

use dotenvy::dotenv;
use music_presence::{Config, PresenceClient}; // from your lib

fn env_required(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("Missing required env var: {key}"))
}

#[tokio::main]
async fn main() {
    // Load .env if present
    let _ = dotenv();

    // Expect these in the environment
    let discord_client_id =
        u64::from_str(&env_required("DISCORD_CLIENT_ID")).expect("DISCORD_CLIENT_ID must be a u64");
    let ws_url = env_required("WS_URL");
    let api_base = env_required("API_BASE");
    let client_token = env_required("CLIENT_TOKEN");

    let cfg = Config {
        discord_client_id,
        ws_url,
        api_base,
        client_token,
    };

    let client = PresenceClient::new(cfg);

    tokio::select! {
        _ = client.run() => {},
        _ = tokio::signal::ctrl_c() => {
            println!("Received Ctrl+C, shutting down...");
        }
    }
}
