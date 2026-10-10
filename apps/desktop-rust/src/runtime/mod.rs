// Zed's `gpui_tokio`

pub mod http_client;

use std::future::Future;
use std::sync::Arc;

use gpui_kit::{App, AppContext, Global, Task};
use tokio::runtime::{Handle, Runtime};
use tokio::task::{AbortHandle, JoinError};

use crate::runtime::http_client::ReqwestHttpClient;

pub fn init(cx: &mut App) {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .expect("failed to start Tokio");

    let handle = runtime.handle().clone();
    cx.set_http_client(Arc::new(ReqwestHttpClient::new(handle.clone())));
    cx.set_global(GlobalTokio {
        runtime: Some(runtime),
        handle,
    });
}

struct GlobalTokio {
    runtime: Option<Runtime>,
    handle: Handle,
}

impl Global for GlobalTokio {}

impl Drop for GlobalTokio {
    fn drop(&mut self) {
        if let Some(runtime) = self.runtime.take() {
            runtime.shutdown_background();
        }
    }
}

/// Aborts the Tokio task unless it finished first.
struct AbortOnDrop(AbortHandle);

impl Drop for AbortOnDrop {
    fn drop(&mut self) {
        self.0.abort();
    }
}

pub struct Tokio;

impl Tokio {
    pub fn spawn<C, Fut, R>(cx: &C, future: Fut) -> Task<Result<R, JoinError>>
    where
        C: AppContext,
        Fut: Future<Output = R> + Send + 'static,
        R: Send + 'static,
    {
        cx.read_global(|tokio: &GlobalTokio, cx| {
            let join_handle = tokio.handle.spawn(future);
            let abort = AbortOnDrop(join_handle.abort_handle());
            cx.background_spawn(async move {
                let result = join_handle.await;
                drop(abort);
                result
            })
        })
    }
}
