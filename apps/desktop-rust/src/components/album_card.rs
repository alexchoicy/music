use gpui_kit::assets::IconName;
use gpui_kit::component::{ActiveTheme, v_flex};
use gpui_kit::*;

use crate::api::models::AlbumListItem;
use crate::components::artwork::artwork;
use crate::components::badge::{BadgeVariant, badge};
use crate::format::{count, duration_hours_minutes};

pub const CARD_RADIUS: Pixels = px(22.);

/// `width` is the card's, borders included.
pub fn album_card(album: &AlbumListItem, width: Pixels, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let cover = width - px(2.);
    let artists = album
        .artists
        .iter()
        .map(|artist| artist.name.as_str())
        .collect::<Vec<_>>()
        .join(", ");
    let artists = if artists.is_empty() {
        "Unknown artist".to_string()
    } else {
        artists
    };
    let duration = duration_hours_minutes(album.total_duration_in_ms).unwrap_or("0m".into());
    let hover_border = theme.ring.opacity(0.24);

    v_flex()
        .id(("album", album.album_id as u64))
        .min_w_0()
        .overflow_hidden()
        .rounded(CARD_RADIUS)
        .border_1()
        .border_color(theme.border)
        .bg(theme.background)
        .hover(move |style| style.border_color(hover_border))
        .child(
            div()
                .relative()
                .w_full()
                .aspect_ratio(1.)
                .overflow_hidden()
                .rounded_t(CARD_RADIUS - px(1.))
                .bg(theme.muted)
                .child(artwork(
                    album.cover_url(),
                    size(cover, cover),
                    CARD_RADIUS - px(1.),
                    IconName::Disc3,
                    theme.muted_foreground,
                ))
                .child(
                    div()
                        .absolute()
                        .left_0()
                        .right_0()
                        .bottom_0()
                        .h(relative(1. / 3.))
                        .bg(linear_gradient(
                            0.,
                            linear_color_stop(theme.foreground.opacity(0.56), 0.),
                            linear_color_stop(transparent_black(), 1.),
                        )),
                )
                .child(div().absolute().right_3().bottom_3().child(badge(
                    album.album_type.clone(),
                    BadgeVariant::Overlay,
                    cx,
                ))),
        )
        .child(
            v_flex()
                .gap_2()
                .p_3()
                .child(
                    v_flex()
                        .min_w_0()
                        .gap_1()
                        .child(
                            div()
                                .truncate()
                                .text_sm()
                                .font_weight(FontWeight::SEMIBOLD)
                                .child(album.title.clone()),
                        )
                        .child(
                            div()
                                .truncate()
                                .text_sm()
                                .text_color(theme.muted_foreground)
                                .child(artists),
                        ),
                )
                .child(meta(
                    [count(album.track_count, "track", "tracks"), duration],
                    cx,
                )),
        )
}

/// Small uppercase details separated by dots, e.g. `12 TRACKS · 48M`.
pub fn meta(items: impl IntoIterator<Item = String>, cx: &App) -> impl IntoElement {
    let text = items
        .into_iter()
        .map(|item| item.to_uppercase())
        .collect::<Vec<_>>()
        .join(" · ");

    div()
        .truncate()
        .text_xs()
        .font_weight(FontWeight::MEDIUM)
        .text_color(cx.theme().muted_foreground)
        .child(text)
}
