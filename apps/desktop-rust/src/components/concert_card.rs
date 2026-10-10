use gpui_kit::assets::IconName;
use gpui_kit::component::{ActiveTheme, v_flex};
use gpui_kit::*;

use crate::api::models::ConcertListItem;
use crate::components::album_card::{CARD_RADIUS, meta};
use crate::components::artwork::artwork;
use crate::format::{count, duration_hours_minutes};

/// `width` is the card's, borders included.
pub fn concert_card(concert: &ConcertListItem, width: Pixels, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let cover = width - px(2.);
    let parties = concert
        .parties
        .iter()
        .map(|party| party.name.as_str())
        .collect::<Vec<_>>()
        .join(", ");
    let parties = if parties.is_empty() {
        "No parties".to_string()
    } else {
        parties
    };
    let duration = duration_hours_minutes(concert.total_duration_in_ms).unwrap_or("0m".into());
    let hover_border = theme.ring.opacity(0.24);

    v_flex()
        .id(("concert", concert.concert_id as u64))
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
                .aspect_ratio(16. / 9.)
                .overflow_hidden()
                .rounded_t(CARD_RADIUS - px(1.))
                .bg(theme.muted)
                .child(artwork(
                    concert.cover_variants.wide_url(),
                    size(cover, cover * (9. / 16.)),
                    CARD_RADIUS - px(1.),
                    IconName::MicVocal,
                    theme.muted_foreground,
                )),
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
                                .child(concert.title.clone()),
                        )
                        .child(
                            div()
                                .truncate()
                                .text_sm()
                                .text_color(theme.muted_foreground)
                                .child(parties),
                        ),
                )
                .child(meta(
                    [
                        count(concert.file_count, "file", "files"),
                        count(concert.album_count, "album", "albums"),
                        duration,
                    ],
                    cx,
                )),
        )
}
