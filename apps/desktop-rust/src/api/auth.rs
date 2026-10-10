use reqwest::StatusCode;
use serde::{Deserialize, Serialize};

use crate::api::{Api, ApiError, client, server_url};

#[derive(Serialize)]
struct LoginRequest<'a> {
    username: &'a str,
    password: &'a str,
}

#[derive(Deserialize)]
struct LoginResult {
    token: String,
}

pub enum LoginError {
    InvalidCredentials,
    Failed,
}

impl LoginError {
    pub fn message(&self) -> &'static str {
        match self {
            Self::InvalidCredentials => "Wrong username or password",
            Self::Failed => "Couldn't sign in. Check your connection and try again.",
        }
    }
}

/// Signs in and returns the bearer token.
pub async fn login(
    domain: String,
    username: String,
    password: String,
) -> Result<String, LoginError> {
    let response = client()
        .map_err(|_| LoginError::Failed)?
        .post(format!("{}/auth/login", server_url(&domain)))
        .json(&LoginRequest {
            username: &username,
            password: &password,
        })
        .send()
        .await
        .map_err(|_| LoginError::Failed)?;

    match response.status() {
        StatusCode::UNAUTHORIZED => Err(LoginError::InvalidCredentials),
        status if status.is_success() => response
            .json::<LoginResult>()
            .await
            .map(|result| result.token)
            .map_err(|_| LoginError::Failed),
        _ => Err(LoginError::Failed),
    }
}

/// Revokes the token on the server.
pub async fn logout(api: Api) -> Result<(), ApiError> {
    api.post("/auth/logout").await
}
