pub mod auth;
pub mod home;
pub mod models;
pub mod server;
pub mod sidebar;

use std::time::Duration;

use gpui_kit::App;
use reqwest::StatusCode;
use serde::de::DeserializeOwned;

use crate::store::session::Session;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

/// The server's base URL; only the domain is stored, and it is always served over https.
pub fn server_url(domain: &str) -> String {
    format!("https://{domain}")
}

/// An HTTP client for the Music server. Runs on Tokio.
pub fn client() -> reqwest::Result<reqwest::Client> {
    reqwest::Client::builder().timeout(REQUEST_TIMEOUT).build()
}

#[derive(Debug)]
pub enum ApiError {
    /// The token was rejected; the user has to sign in again.
    Unauthorized,
    Failed,
}

/// Calls the signed-in server. Its futures run on Tokio.
#[derive(Clone)]
pub struct Api {
    domain: String,
    token: String,
}

impl Api {
    pub fn from_session(cx: &App) -> Option<Self> {
        let session = cx.global::<Session>();
        Some(Self {
            domain: session.domain.clone()?,
            token: session.token.clone()?,
        })
    }

    async fn send(&self, request: reqwest::RequestBuilder) -> Result<reqwest::Response, ApiError> {
        let response = request
            .bearer_auth(&self.token)
            .send()
            .await
            .map_err(|_| ApiError::Failed)?;

        match response.status() {
            StatusCode::UNAUTHORIZED => Err(ApiError::Unauthorized),
            status if status.is_success() => Ok(response),
            _ => Err(ApiError::Failed),
        }
    }

    pub async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T, ApiError> {
        let client = client().map_err(|_| ApiError::Failed)?;
        let request = client
            .get(format!("{}{path}", server_url(&self.domain)))
            .query(query);

        self.send(request)
            .await?
            .json()
            .await
            .map_err(|_| ApiError::Failed)
    }

    pub async fn post(&self, path: &str) -> Result<(), ApiError> {
        let client = client().map_err(|_| ApiError::Failed)?;
        let request = client.post(format!("{}{path}", server_url(&self.domain)));

        self.send(request).await.map(|_| ())
    }
}
