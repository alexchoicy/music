use crate::PresenceClient;

use crate::types::TrackData;

pub async fn get_track_data(ctx: &PresenceClient, track_id: &str) -> Option<TrackData> {
    let url = format!("{}/tracks/{}", ctx.cfg.api_base, track_id);
    let resp = ctx
        .http
        .get(&url)
        .bearer_auth(&ctx.cfg.client_token)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        eprintln!("Failed to fetch track data: HTTP {}", resp.status());
        return None;
    }
    resp.json().await.ok()
}
