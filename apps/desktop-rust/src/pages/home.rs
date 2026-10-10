use gpui_kit::component::button::Button;
use gpui_kit::component::spinner::Spinner;
use gpui_kit::component::{ActiveTheme, Sizable, h_flex, v_flex};
use gpui_kit::*;

use crate::api::home::{HomeData, load_home};
use crate::api::{Api, ApiError};
use crate::components::album_card::album_card;
use crate::components::app_sidebar::SIDEBAR_WIDTH;
use crate::components::concert_card::concert_card;
use crate::components::library_counts::library_counts;
use crate::components::party_card::party_card;
use crate::pages::Loadable;
use crate::route::{Navigate, Route};
use crate::runtime::Tokio;
use crate::store::session::Session;

const PADDING: Pixels = px(24.);
const GAP: Pixels = px(16.);

pub struct HomePage {
    data: Loadable<HomeData>,
    navigate: Navigate,
    _load: Option<Task<()>>,
}

impl HomePage {
    pub fn new(navigate: Navigate, cx: &mut Context<Self>) -> Self {
        let mut page = Self {
            data: Loadable::Loading,
            navigate,
            _load: None,
        };
        page.load(cx);
        page
    }

    fn load(&mut self, cx: &mut Context<Self>) {
        let Some(api) = Api::from_session(cx) else {
            return;
        };
        self.data = Loadable::Loading;
        let request = Tokio::spawn(cx, load_home(api));
        self._load = Some(cx.spawn(async move |this, cx| {
            let result = request.await;
            _ = this.update(cx, |this, cx| {
                this.data = match result {
                    Ok(Ok(data)) => Loadable::Ready(data),
                    Ok(Err(ApiError::Unauthorized)) => {
                        Session::sign_out(cx);
                        Loadable::Failed
                    }
                    _ => Loadable::Failed,
                };
                cx.notify();
            });
        }));
        cx.notify();
    }

    fn section(
        &self,
        title: &'static str,
        route: Route,
        content: impl IntoElement,
        cx: &App,
    ) -> impl IntoElement {
        let theme = cx.theme();
        let navigate = self.navigate.clone();
        let foreground = theme.foreground;

        v_flex()
            .gap_4()
            .child(
                h_flex()
                    .justify_between()
                    .items_end()
                    .gap_4()
                    .child(
                        div()
                            .text_xl()
                            .font_weight(FontWeight::SEMIBOLD)
                            .child(title),
                    )
                    .child(
                        div()
                            .id(title)
                            .text_sm()
                            .font_weight(FontWeight::MEDIUM)
                            .text_color(theme.muted_foreground)
                            .cursor_pointer()
                            .hover(move |style| style.text_color(foreground))
                            .on_click(move |_, window, cx| navigate(route.clone(), window, cx))
                            .child("View all"),
                    ),
            )
            .child(content)
    }
}

/// Album columns at the web's breakpoints, which include the sidebar.
fn album_columns(viewport_width: Pixels) -> usize {
    match viewport_width.as_f32() {
        width if width >= 2100. => 8,
        width if width >= 1800. => 7,
        width if width >= 1536. => 6,
        width if width >= 1280. => 5,
        width if width >= 1024. => 4,
        _ => 3,
    }
}

fn grid(columns: usize, items: impl IntoIterator<Item = AnyElement>) -> impl IntoElement {
    div()
        .grid()
        .grid_cols(columns as u16)
        .gap(GAP)
        .children(items.into_iter().take(columns))
}

impl Render for HomePage {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let viewport_width = window.viewport_size().width;
        let album_columns = album_columns(viewport_width);
        let recent_columns = album_columns.min(6);
        let content_width = viewport_width - SIDEBAR_WIDTH - PADDING * 2.;
        let card_width =
            |columns: usize| (content_width - GAP * (columns - 1) as f32) / columns as f32;
        let album_width = card_width(album_columns);
        let recent_width = card_width(recent_columns);

        let header = v_flex()
            .gap_1()
            .child(
                div()
                    .text_sm()
                    .font_weight(FontWeight::MEDIUM)
                    .text_color(theme.muted_foreground)
                    .child("Library"),
            )
            .child(
                div()
                    .text_size(rems(2.25))
                    .font_weight(FontWeight::SEMIBOLD)
                    .child("Overview"),
            );

        let content = match &self.data {
            Loadable::Loading => h_flex()
                .flex_1()
                .justify_center()
                .child(Spinner::new().large())
                .into_any_element(),
            Loadable::Failed => v_flex()
                .flex_1()
                .items_center()
                .justify_center()
                .gap_4()
                .text_color(theme.muted_foreground)
                .child("Couldn't load your library.")
                .child(
                    Button::new("retry")
                        .outline()
                        .label("Try again")
                        .on_click(cx.listener(|this, _, _, cx| this.load(cx))),
                )
                .into_any_element(),
            Loadable::Ready(data) => v_flex()
                .gap_8()
                .child(library_counts(&data.overview, &self.navigate, cx))
                .child(
                    self.section(
                        "Recent albums",
                        Route::Albums,
                        grid(
                            album_columns,
                            data.albums
                                .iter()
                                .map(|album| album_card(album, album_width, cx).into_any_element()),
                        ),
                        cx,
                    ),
                )
                .child(self.section(
                    "Recent concerts",
                    Route::Concerts,
                    grid(
                        recent_columns,
                        data.concerts.iter().map(|concert| {
                            concert_card(concert, recent_width, cx).into_any_element()
                        }),
                    ),
                    cx,
                ))
                .child(self.section(
                    "Recent parties",
                    Route::Parties,
                    grid(
                        recent_columns,
                        data.parties.iter().map(|party| {
                            party_card(party, recent_width >= px(256.), cx).into_any_element()
                        }),
                    ),
                    cx,
                ))
                .into_any_element(),
        };

        v_flex()
            .min_h_full()
            .w_full()
            .gap_8()
            .p(PADDING)
            .child(header)
            .child(content)
    }
}
