use std::rc::Rc;

use gpui_kit::component::{ActiveTheme, h_flex, v_flex};
use gpui_kit::*;

use crate::api::auth::logout;
use crate::api::sidebar::{SidebarData, load_sidebar};
use crate::api::{Api, ApiError};
use crate::components::app_sidebar::app_sidebar;
use crate::pages::home::HomePage;
use crate::route::{Navigate, Route};
use crate::runtime::Tokio;
use crate::store::session::Session;

actions!(shell, [GoHome, GoAlbums, GoParties, GoConcerts]);

pub const KEY_CONTEXT: &str = "Shell";

pub fn bind_keys(cx: &mut App) {
    cx.bind_keys([
        KeyBinding::new("1", GoHome, Some(KEY_CONTEXT)),
        KeyBinding::new("2", GoAlbums, Some(KEY_CONTEXT)),
        KeyBinding::new("3", GoParties, Some(KEY_CONTEXT)),
        KeyBinding::new("4", GoConcerts, Some(KEY_CONTEXT)),
    ]);
}

/// The signed-in app: the sidebar and the current page.
pub struct Shell {
    route: Route,
    sidebar: Option<SidebarData>,
    home: Entity<HomePage>,
    navigate: Navigate,
    focus_handle: FocusHandle,
    _load: Task<()>,
}

impl Shell {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let shell = cx.entity().downgrade();
        let navigate: Navigate = Rc::new(move |route, _, cx| {
            _ = shell.update(cx, |shell, cx| shell.navigate(route, cx));
        });
        let home = cx.new(|cx| HomePage::new(navigate.clone(), cx));
        let focus_handle = cx.focus_handle();
        focus_handle.focus(window, cx);

        Self {
            route: Route::Home,
            sidebar: None,
            home,
            navigate,
            focus_handle,
            _load: Self::load_sidebar(cx),
        }
    }

    fn load_sidebar(cx: &mut Context<Self>) -> Task<()> {
        let Some(api) = Api::from_session(cx) else {
            return Task::ready(());
        };
        let request = Tokio::spawn(cx, load_sidebar(api));
        cx.spawn(async move |this, cx| {
            let result = request.await;
            _ = this.update(cx, |this, cx| match result {
                Ok(Ok(data)) => {
                    this.sidebar = Some(data);
                    cx.notify();
                }
                Ok(Err(ApiError::Unauthorized)) => Session::sign_out(cx),
                _ => {}
            });
        })
    }

    fn navigate(&mut self, route: Route, cx: &mut Context<Self>) {
        self.route = route;
        cx.notify();
    }

    fn logout(window: &mut Window, cx: &mut App) {
        _ = window;
        if let Some(api) = Api::from_session(cx) {
            Tokio::spawn(cx, logout(api)).detach();
        }
        Session::sign_out(cx);
    }

    /// Pages other than Home are not built yet.
    fn placeholder(&self, cx: &App) -> impl IntoElement {
        v_flex()
            .gap_1()
            .p_6()
            .child(
                div()
                    .text_sm()
                    .font_weight(FontWeight::MEDIUM)
                    .text_color(cx.theme().muted_foreground)
                    .child("Library"),
            )
            .child(
                div()
                    .text_size(rems(2.25))
                    .font_weight(FontWeight::SEMIBOLD)
                    .child(self.route.title()),
            )
    }
}

impl Render for Shell {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let page = match self.route {
            Route::Home => self.home.clone().into_any_element(),
            _ => self.placeholder(cx).into_any_element(),
        };

        h_flex()
            .size_full()
            .track_focus(&self.focus_handle)
            .key_context(KEY_CONTEXT)
            .on_action(cx.listener(|this, _: &GoHome, _, cx| this.navigate(Route::Home, cx)))
            .on_action(cx.listener(|this, _: &GoAlbums, _, cx| this.navigate(Route::Albums, cx)))
            .on_action(cx.listener(|this, _: &GoParties, _, cx| this.navigate(Route::Parties, cx)))
            .on_action(
                cx.listener(|this, _: &GoConcerts, _, cx| this.navigate(Route::Concerts, cx)),
            )
            .bg(theme.background)
            .text_color(theme.foreground)
            .child(app_sidebar(
                &self.route,
                self.sidebar.as_ref(),
                &self.navigate,
                Rc::new(Self::logout),
                cx,
            ))
            .child(
                div()
                    .id("page")
                    .flex_1()
                    .min_w_0()
                    .h_full()
                    .overflow_y_scroll()
                    .child(page),
            )
    }
}
