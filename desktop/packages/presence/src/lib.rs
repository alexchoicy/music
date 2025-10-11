use discord_presence::Client as DiscordClient;
use futures_util::StreamExt;
use http::header::AUTHORIZATION;
use reqwest::Client as ReqwestClient;
use std::sync::{Arc, Mutex};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, client::IntoClientRequest},
};

mod api;
mod discord;
mod types;

use discord::display_discord;
use types::{TrackData, WSMessage, WSMusicAction, WSMusicMessageServerPayload};

use crate::{api::get_track_data, discord::get_time_stamp};

pub type TrackDataState = Arc<Mutex<Option<TrackData>>>;
pub struct Config {
    pub discord_client_id: u64,
    pub ws_url: String,
    pub api_base: String,
    pub client_token: String,
}

pub struct PresenceClient {
    cfg: Config,
    http: ReqwestClient,
    state: TrackDataState,
    discord: Arc<Mutex<DiscordClient>>,
}

impl PresenceClient {
    pub fn new(cfg: Config) -> Self {
        Self {
            discord: Arc::new(Mutex::new(DiscordClient::new(cfg.discord_client_id))),
            http: ReqwestClient::new(),
            state: Arc::new(Mutex::new(None)),
            cfg,
        }
    }

    pub async fn run(&self) {
        {
            let mut client = self.discord.lock().unwrap();
            client.start(); // Assuming this spawns internally and returns immediately
        }

        let mut req = self
            .cfg
            .ws_url
            .clone()
            .into_client_request()
            .expect("Failed to create request");

        req.headers_mut().insert(
            AUTHORIZATION,
            format!("Bearer {}", self.cfg.client_token).parse().unwrap(),
        );

        let (ws_stream, _) = connect_async(req).await.expect("Failed to connect");

        println!("WebSocket connected to {}", self.cfg.ws_url);

        let (_write, mut read) = ws_stream.split();

        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(txt)) => match serde_json::from_str::<WSMessage>(&txt) {
                    Ok(ws_msg) => match ws_msg {
                        WSMessage::Music(payload) => {
                            Self::on_music_request(&self, &payload).await;
                        }
                        WSMessage::Others() => {
                            println!("Received other type of message");
                        }
                    },
                    Err(e) => {
                        eprintln!("Failed to parse WS message: {}", e);
                    }
                },

                Ok(Message::Pong(_)) => {}
                Ok(Message::Close(frame)) => {
                    println!("[close] from server: {:?}", frame);
                    break;
                }

                Err(e) => {
                    eprintln!("WS error: {e}");
                    break;
                }

                Ok(_) => {}
            }
        }
    }

    fn get_state_data(state: &TrackDataState) -> Option<TrackData> {
        state.lock().ok()?.clone()
    }

    fn save_state_data(state: &TrackDataState, track_data: TrackData) {
        if let Ok(mut guard) = state.lock() {
            *guard = Some(track_data);
        }
    }

    async fn on_music_request(ctx: &PresenceClient, payload: &WSMusicMessageServerPayload) {
        match payload.action {
            WSMusicAction::Play => {
                let current_id = Self::get_state_data(&ctx.state).map(|t| t.track_id);

                let needs_fetch = current_id.as_deref() != Some(&payload.track_id);
                if needs_fetch {
                    if let Some(td) = get_track_data(ctx, &payload.track_id).await {
                        Self::save_state_data(&ctx.state, td);
                    }
                }
                if let Some(td) = Self::get_state_data(&ctx.state) {
                    let time_stamp =
                        get_time_stamp(payload.position_ms, payload.server_time, td.duration);
                    let mut client = ctx.discord.lock().unwrap();
                    display_discord(&mut client, &td, time_stamp).await;
                }
            }
            WSMusicAction::Pause => {
                let mut client = ctx.discord.lock().unwrap();
                let error = client.clear_activity();
                if let Err(e) = error {
                    eprintln!("Failed to clear Discord activity: {}", e);
                }
            }
            WSMusicAction::Change => {
                if let Some(td) = get_track_data(ctx, &payload.track_id).await {
                    Self::save_state_data(&ctx.state, td);
                    if let Some(saved_td) = Self::get_state_data(&ctx.state) {
                        let time_stamp = get_time_stamp(
                            payload.position_ms,
                            payload.server_time,
                            saved_td.duration,
                        );
                        let mut client = ctx.discord.lock().unwrap();
                        display_discord(&mut client, &saved_td, time_stamp).await;
                    }
                }
            }
            WSMusicAction::ChangeTime => {
                if let Some(td) = Self::get_state_data(&ctx.state) {
                    let time_stamp =
                        get_time_stamp(payload.position_ms, payload.server_time, td.duration);
                    let mut client = ctx.discord.lock().unwrap();
                    display_discord(&mut client, &td, time_stamp).await;
                }
            }
        }
    }
}
