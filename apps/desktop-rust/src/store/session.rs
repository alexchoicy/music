use std::io::{self, Write as _};
use std::{fs, path::PathBuf};

use gpui_kit::{App, Global};
use serde::{Deserialize, Serialize};

/// The configured server's domain and its bearer token, persisted in the user's
/// config directory. The file is readable only by the user, as it holds the token.
#[derive(Clone, Default, Serialize, Deserialize)]
pub struct Session {
    pub domain: Option<String>,
    pub token: Option<String>,
}

impl Global for Session {}

impl Session {
    pub fn load() -> Self {
        config_path()
            .and_then(|path| fs::read(path).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }

    pub fn set_domain(domain: Option<String>, cx: &mut App) -> io::Result<()> {
        // A token is only valid for the server that issued it.
        Self::update(cx, |session| {
            session.domain = domain;
            session.token = None;
        })
    }

    pub fn set_token(token: Option<String>, cx: &mut App) -> io::Result<()> {
        Self::update(cx, |session| session.token = token)
    }

    /// Forgets the token, e.g. when the server rejects it.
    pub fn sign_out(cx: &mut App) {
        if let Err(error) = Self::set_token(None, cx) {
            eprintln!("Couldn't clear the sign-in: {error}");
        }
    }

    fn update(cx: &mut App, edit: impl FnOnce(&mut Session)) -> io::Result<()> {
        let mut session = cx.global::<Session>().clone();
        edit(&mut session);
        session.save()?;
        cx.set_global(session);
        Ok(())
    }

    fn save(&self) -> io::Result<()> {
        let path = config_path().ok_or_else(|| io::Error::other("No config directory"))?;
        if let Some(dir) = path.parent() {
            fs::create_dir_all(dir)?;
        }

        let mut options = fs::OpenOptions::new();
        options.write(true).create(true).truncate(true);
        #[cfg(unix)]
        std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
        options
            .open(path)?
            .write_all(&serde_json::to_vec_pretty(self)?)
    }
}

fn config_path() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join("music").join("session.json"))
}
