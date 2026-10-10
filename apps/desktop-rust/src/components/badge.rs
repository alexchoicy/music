use gpui_kit::component::ActiveTheme;
use gpui_kit::*;

#[derive(Clone, Copy)]
pub enum BadgeVariant {
    Primary,
    Secondary,
    Outline,
    /// Over artwork.
    Overlay,
}

pub fn badge(label: impl Into<SharedString>, variant: BadgeVariant, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let (background, foreground, border) = match variant {
        BadgeVariant::Primary => (theme.primary, theme.primary_foreground, theme.primary),
        BadgeVariant::Secondary => (theme.secondary, theme.secondary_foreground, theme.secondary),
        BadgeVariant::Outline => (transparent_black(), theme.foreground, theme.border),
        BadgeVariant::Overlay => (
            theme.background.opacity(0.9),
            theme.foreground,
            theme.background.opacity(0.9),
        ),
    };

    div()
        .flex_none()
        .px_1p5()
        .rounded_md()
        .border_1()
        .border_color(border)
        .bg(background)
        .text_color(foreground)
        .text_xs()
        .font_weight(FontWeight::MEDIUM)
        .child(label.into())
}
