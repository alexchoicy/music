use crate::api::models::{AlbumListItem, ConcertListItem, HomeOverview, PartyListItem};
use crate::api::{Api, ApiError};

const RECENT: &[(&str, &str)] = &[("Sort", "CreatedAtDesc"), ("Limit", "10")];

pub struct HomeData {
    pub overview: HomeOverview,
    pub albums: Vec<AlbumListItem>,
    pub concerts: Vec<ConcertListItem>,
    pub parties: Vec<PartyListItem>,
}

/// The library counts and the most recently added albums, concerts and parties.
pub async fn load_home(api: Api) -> Result<HomeData, ApiError> {
    let parties_query = [RECENT, &[("ExcludeNoAlbums", "true")]].concat();
    let (overview, albums, concerts, parties) = futures::try_join!(
        api.get("/home", &[]),
        api.get("/albums", RECENT),
        api.get("/concerts", RECENT),
        api.get("/parties", &parties_query),
    )?;

    Ok(HomeData {
        overview,
        albums,
        concerts,
        parties,
    })
}
