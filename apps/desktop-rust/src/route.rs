use std::rc::Rc;

use gpui_kit::{App, SharedString, Window};

pub type Navigate = Rc<dyn Fn(Route, &mut Window, &mut App)>;

/// A page of the signed-in app.
#[derive(Clone, PartialEq)]
pub enum Route {
    Home,
    Albums,
    Parties,
    Concerts,
    Playlists,
    History,
    Playlist { id: i64, name: SharedString },
}

impl Route {
    pub fn title(&self) -> SharedString {
        match self {
            Self::Home => "Overview".into(),
            Self::Albums => "Albums".into(),
            Self::Parties => "Parties".into(),
            Self::Concerts => "Concerts".into(),
            Self::Playlists => "Playlists".into(),
            Self::History => "History".into(),
            Self::Playlist { name, .. } => name.clone(),
        }
    }
}
