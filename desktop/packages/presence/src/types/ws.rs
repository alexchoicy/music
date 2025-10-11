use serde::Deserialize;

#[derive(Debug, Deserialize, PartialEq)]
pub enum WSMusicAction {
    #[serde(rename = "play")]
    Play,
    #[serde(rename = "pause")]
    Pause,
    #[serde(rename = "change")]
    Change,
    #[serde(rename = "changeTime")]
    ChangeTime,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TrackData {
    #[serde(rename = "trackID")]
    pub track_id: String,
    pub cover: Option<String>,
    #[serde(rename = "albumName")]
    pub album_name: String,
    #[serde(rename = "trackName")]
    pub title: String,
    pub artists: Vec<String>,
    pub duration: u64,
    #[serde(rename = "noOfTracks")]
    pub no_of_tracks: u64,
    #[serde(rename = "trackNo")]
    pub track_no: u64,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WSMessage {
    #[serde(rename = "music")]
    Music(WSMusicMessageServerPayload),
    #[serde(rename = "others")]
    Others(),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WSMusicMessageServerPayload {
    pub action: WSMusicAction,
    #[serde(rename = "userID")]
    pub _user_id: String,
    pub position_ms: f64,
    #[serde(rename = "trackID")]
    pub track_id: String,
    #[serde(rename = "ServerTime")]
    pub server_time: u64,
}
