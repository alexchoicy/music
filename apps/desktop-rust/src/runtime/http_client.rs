//! Lets GPUI fetch over HTTP, e.g. `img(url)`, through reqwest on Tokio.
//! GPUI has no HTTP client of its own on desktop.

use futures::AsyncReadExt as _;
use futures::future::BoxFuture;
use gpui_kit::http_client::http::{HeaderValue, Request, Response};
use gpui_kit::http_client::{AsyncBody, HttpClient, Inner, Url};
use tokio::runtime::Handle;

pub struct ReqwestHttpClient {
    client: reqwest::Client,
    handle: Handle,
}

impl ReqwestHttpClient {
    pub fn new(handle: Handle) -> Self {
        Self {
            client: reqwest::Client::new(),
            handle,
        }
    }
}

impl HttpClient for ReqwestHttpClient {
    fn user_agent(&self) -> Option<&HeaderValue> {
        None
    }

    fn proxy(&self) -> Option<&Url> {
        None
    }

    fn send(
        &self,
        request: Request<AsyncBody>,
    ) -> BoxFuture<'static, anyhow::Result<Response<AsyncBody>>> {
        let client = self.client.clone();
        let handle = self.handle.clone();

        Box::pin(async move {
            let (parts, body) = request.into_parts();
            let body = match body.0 {
                Inner::Empty => Vec::new(),
                Inner::Bytes(cursor) => cursor.into_inner().to_vec(),
                Inner::AsyncReader(mut reader) => {
                    let mut bytes = Vec::new();
                    reader.read_to_end(&mut bytes).await?;
                    bytes
                }
            };
            let request = client
                .request(parts.method, parts.uri.to_string())
                .headers(parts.headers)
                .body(body);

            let (status, headers, bytes) = handle
                .spawn(async move {
                    let response = request.send().await?;
                    let status = response.status();
                    let headers = response.headers().clone();
                    anyhow::Ok((status, headers, response.bytes().await?))
                })
                .await??;

            let mut response = Response::builder().status(status);
            if let Some(response_headers) = response.headers_mut() {
                *response_headers = headers;
            }
            Ok(response.body(AsyncBody::from_bytes(bytes))?)
        })
    }
}
