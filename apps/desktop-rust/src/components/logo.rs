use gpui_kit::component::{ActiveTheme, Icon, h_flex};
use gpui_kit::*;

const LOGO: &[u8] = include_bytes!("../../assets/icons/file.svg");

/// The app logo on a primary tile.
pub fn logo(tile: Pixels, icon: Pixels, radius: Pixels, cx: &App) -> impl IntoElement {
    let theme = cx.theme();

    h_flex()
        .flex_none()
        .size(tile)
        .justify_center()
        .rounded(radius)
        .bg(theme.primary)
        .child(
            Icon::empty()
                .data(LOGO)
                .size(icon)
                .text_color(theme.primary_foreground),
        )
}
