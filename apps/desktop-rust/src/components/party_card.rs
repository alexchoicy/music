use gpui_kit::component::{ActiveTheme, h_flex, v_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::*;

use crate::api::models::PartyListItem;
use crate::components::artwork::cover_image;
use crate::components::badge::{BadgeVariant, badge};
use crate::format::{country_label, initials, party_kind_label};

/// `wide` places the avatar beside the name, as the web does from 16rem.
pub fn party_card(party: &PartyListItem, wide: bool, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let avatar_size = if wide { px(80.) } else { px(48.) };
    let gender = party
        .gender
        .as_deref()
        .filter(|gender| *gender != "Unknown");
    let releases = if party.album_count == 1 {
        "release"
    } else {
        "releases"
    };
    let initials = initials(&party.name);

    let avatar = h_flex()
        .flex_none()
        .relative()
        .size(avatar_size)
        .justify_center()
        .overflow_hidden()
        .rounded_2xl()
        .border_1()
        .border_color(theme.border)
        .bg(theme.muted)
        .text_lg()
        .child(initials.clone())
        .when_some(
            party.cover_url.as_deref().filter(|url| !url.is_empty()),
            |avatar, url| {
                avatar.child(cover_image(url, size(avatar_size, avatar_size)).rounded(px(15.)))
            },
        );

    let name = v_flex()
        .w_full()
        .min_w_0()
        .flex_1()
        .gap_1()
        .when(wide, |name| name.pt_1())
        .child(
            div()
                .truncate()
                .text_sm()
                .font_weight(FontWeight::SEMIBOLD)
                .child(party.name.clone()),
        )
        .child(
            div()
                .truncate()
                .text_sm()
                .text_color(theme.muted_foreground)
                .child(country_label(&party.country).to_string()),
        );

    v_flex()
        .id(("party", party.party_id as u64))
        .min_w_0()
        .gap_3()
        .p_3()
        .rounded_2xl()
        .border_1()
        .border_color(theme.border)
        .bg(theme.background)
        .child(
            div()
                .flex()
                .when(wide, |header| header.flex_row().gap_4())
                .when(!wide, |header| header.flex_col().gap_2())
                .child(avatar)
                .child(name),
        )
        .child(
            h_flex()
                .flex_wrap()
                .gap_1p5()
                .when_some(party.party_type.clone(), |badges, party_type| {
                    badges.child(badge(party_type, BadgeVariant::Primary, cx))
                })
                .child(badge(
                    party_kind_label(&party.kind).to_string(),
                    BadgeVariant::Secondary,
                    cx,
                ))
                .when_some(gender, |badges, gender| {
                    badges.child(badge(gender.to_string(), BadgeVariant::Outline, cx))
                }),
        )
        .child(
            h_flex()
                .mt_auto()
                .justify_between()
                .gap_1()
                .pt_2()
                .border_t_1()
                .border_color(theme.border)
                .text_xs()
                .child(div().text_color(theme.muted_foreground).child("Albums"))
                .child(
                    div()
                        .font_weight(FontWeight::SEMIBOLD)
                        .child(format!("{} {releases}", party.album_count)),
                ),
        )
}
