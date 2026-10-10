use crate::api::models::{PlaylistListItem, UserInfo};
use crate::api::{Api, ApiError};

pub struct SidebarData {
    pub user: UserInfo,
    pub playlists: Vec<PlaylistListItem>,
}

/// The signed-in user and their playlists.
pub async fn load_sidebar(api: Api) -> Result<SidebarData, ApiError> {
    let (user, playlists) = futures::try_join!(api.get("/me", &[]), api.get("/playlists", &[]))?;
    Ok(SidebarData { user, playlists })
}
