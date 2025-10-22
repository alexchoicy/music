use discord_presence::{
    Client as DiscordClient,
    models::{Activity, ActivityTimestamps, ActivityType},
};

use crate::types::TrackData;

pub fn display_discord(
    discord_client: &mut DiscordClient,
    track_data: &TrackData,
    position: ActivityTimestamps,
) {
    let activity = Activity {
        state: Some(format!("by {}", track_data.artists.join(", "))),
        activity_type: Some(ActivityType::Listening),
        name: Some(format!("{}", track_data.artists.join(", "))),
        details: Some(format!("{} - {}", track_data.title, track_data.album_name)),
        timestamps: Some(position),
        assets: Some({
            let mut assets = discord_presence::models::ActivityAssets::default();
            if let Some(url) = &track_data.cover {
                assets.large_image = Some(url.clone());
            } else {
                assets.large_image = Some("default".to_string());
            }
            assets
        }),
        ..Default::default()
    };
    let _error = discord_client.set_activity(|_| activity);
}

pub fn get_time_stamp(position: f64, server_time: u64, duration: u64) -> ActivityTimestamps {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time before UNIX EPOCH")
        .as_millis() as u64;
    let latency = now.saturating_sub(server_time);
    let fixed_position = position + latency as f64;
    let start_time = now.saturating_sub(fixed_position as u64);
    ActivityTimestamps::new()
        .start(start_time)
        .end(start_time + duration)
}
