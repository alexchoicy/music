use crate::api::{client, server_url};

/// Whether the input is a bare domain such as `music.example.com`.
pub fn is_valid_domain(domain: &str) -> bool {
    !domain.is_empty()
        && domain
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | ':'))
}

/// Whether a Music server answers at the domain, before it is saved.
pub async fn check_server(domain: String) -> bool {
    let Ok(client) = client() else {
        return false;
    };

    client
        .get(format!("{}/auth", server_url(&domain)))
        .send()
        .await
        .is_ok_and(|response| matches!(response.status().as_u16(), 200 | 401))
}
