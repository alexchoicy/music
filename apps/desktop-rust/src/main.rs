mod api;
mod app;
mod assets;
mod components;
mod format;
mod pages;
mod route;
mod runtime;
mod screens;
mod store;
mod theme;

use gpui_kit::*;

use crate::app::MusicApp;
use crate::assets::AppAssets;
use crate::store::session::Session;
use crate::theme::init_theme;

fn main() {
    gpui_kit::application().with_assets(AppAssets).run(|cx| {
        gpui_kit::init(cx);
        runtime::init(cx);
        init_theme(cx);
        screens::shell::bind_keys(cx);
        cx.set_global(Session::load());

        let options = WindowOptions {
            window_bounds: Some(WindowBounds::centered(size(px(1280.), px(800.)), cx)),
            titlebar: Some(TitlebarOptions {
                title: Some("Music".into()),
                ..Default::default()
            }),
            window_min_size: Some(size(px(768.), px(600.))),
            ..Default::default()
        };
        gpui_kit::open_window(options, cx, |window, cx| {
            cx.new(|cx| MusicApp::new(window, cx))
        })
        .expect("failed to open window");
    });
}
