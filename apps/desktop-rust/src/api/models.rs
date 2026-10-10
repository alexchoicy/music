//! The parts of the server's responses the app reads.

use serde::{Deserialize, Deserializer};

/// Integers the API may send as numbers or numeric strings.
fn number<'de, D: Deserializer<'de>>(deserializer: D) -> Result<i64, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Number {
        Int(i64),
        Text(String),
    }

    match Number::deserialize(deserializer)? {
        Number::Int(value) => Ok(value),
        Number::Text(text) => text.parse().map_err(serde::de::Error::custom),
    }
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub user_name: String,
    pub roles: Vec<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistListItem {
    #[serde(deserialize_with = "number")]
    pub playlist_id: i64,
    pub name: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeOverview {
    #[serde(deserialize_with = "number")]
    pub album_count: i64,
    #[serde(deserialize_with = "number")]
    pub artist_count: i64,
    #[serde(deserialize_with = "number")]
    pub concert_count: i64,
}

#[derive(Clone, Deserialize)]
pub struct FileObject {
    pub url: String,
}

#[derive(Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageFileVariants {
    pub original: Option<FileObject>,
    #[serde(rename = "imageCover1024x1024")]
    pub cover: Option<FileObject>,
    #[serde(rename = "imageWide1280x720")]
    pub wide: Option<FileObject>,
}

impl ImageFileVariants {
    pub fn cover_url(&self) -> Option<&str> {
        self.cover
            .as_ref()
            .or(self.original.as_ref())
            .map(|file| file.url.as_str())
    }

    pub fn wide_url(&self) -> Option<&str> {
        self.wide
            .as_ref()
            .or(self.original.as_ref())
            .map(|file| file.url.as_str())
    }
}

#[derive(Clone, Deserialize)]
pub struct Named {
    pub name: String,
}

#[derive(Clone, Deserialize)]
pub struct DiscCover {
    pub variants: ImageFileVariants,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumListItem {
    #[serde(deserialize_with = "number")]
    pub album_id: i64,
    pub title: String,
    #[serde(rename = "type")]
    pub album_type: String,
    #[serde(default)]
    pub cover_variants: Option<ImageFileVariants>,
    #[serde(default)]
    pub disc_covers: Vec<DiscCover>,
    pub artists: Vec<Named>,
    #[serde(deserialize_with = "number")]
    pub track_count: i64,
    #[serde(deserialize_with = "number")]
    pub total_duration_in_ms: i64,
}

impl AlbumListItem {
    /// The first disc's cover, then the album's.
    pub fn cover_url(&self) -> Option<&str> {
        self.disc_covers
            .iter()
            .find_map(|disc| disc.variants.cover_url())
            .or_else(|| self.cover_variants.as_ref()?.cover_url())
    }
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConcertListItem {
    #[serde(deserialize_with = "number")]
    pub concert_id: i64,
    pub title: String,
    #[serde(default)]
    pub cover_variants: ImageFileVariants,
    pub parties: Vec<Named>,
    #[serde(deserialize_with = "number")]
    pub album_count: i64,
    #[serde(deserialize_with = "number")]
    pub file_count: i64,
    #[serde(deserialize_with = "number")]
    pub total_duration_in_ms: i64,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartyListItem {
    #[serde(deserialize_with = "number")]
    pub party_id: i64,
    pub name: String,
    #[serde(default)]
    pub cover_url: Option<String>,
    pub country: String,
    #[serde(rename = "type", default)]
    pub party_type: Option<String>,
    pub kind: String,
    #[serde(default)]
    pub gender: Option<String>,
    #[serde(deserialize_with = "number")]
    pub album_count: i64,
}
