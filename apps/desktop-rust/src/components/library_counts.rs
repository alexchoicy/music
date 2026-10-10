use gpui_kit::assets::IconName;
use gpui_kit::component::{ActiveTheme, Icon, h_flex, v_flex};
use gpui_kit::*;

use crate::api::models::HomeOverview;
use crate::route::{Navigate, Route};

pub fn library_counts(overview: &HomeOverview, navigate: &Navigate, cx: &App) -> impl IntoElement {
    div()
        .grid()
        .grid_cols(3)
        .gap_4()
        .child(counter_card(
            "Albums",
            overview.album_count,
            IconName::Disc3,
            Route::Albums,
            navigate,
            cx,
        ))
        .child(counter_card(
            "Parties",
            overview.artist_count,
            IconName::UsersRound,
            Route::Parties,
            navigate,
            cx,
        ))
        .child(counter_card(
            "Concerts",
            overview.concert_count,
            IconName::MicVocal,
            Route::Concerts,
            navigate,
            cx,
        ))
}

fn counter_card(
    label: &'static str,
    count: i64,
    icon: IconName,
    route: Route,
    navigate: &Navigate,
    cx: &App,
) -> impl IntoElement {
    let theme = cx.theme();
    let navigate = navigate.clone();
    let hover_border = theme.ring.opacity(0.24);

    h_flex()
        .id(label)
        .justify_between()
        .gap_4()
        .p_4()
        .rounded_2xl()
        .border_1()
        .border_color(theme.border)
        .bg(theme.background)
        .cursor_pointer()
        .hover(move |style| style.border_color(hover_border))
        .on_click(move |_, window, cx| navigate(route.clone(), window, cx))
        .child(
            v_flex()
                .gap_2()
                .child(
                    div()
                        .text_sm()
                        .text_color(theme.muted_foreground)
                        .child(label),
                )
                .child(
                    div()
                        .text_3xl()
                        .font_weight(FontWeight::SEMIBOLD)
                        .child(count.to_string()),
                ),
        )
        .child(
            h_flex()
                .flex_none()
                .size_12()
                .justify_center()
                .rounded_2xl()
                .bg(theme.muted)
                .child(Icon::new(icon).size_6().text_color(theme.muted_foreground)),
        )
}
