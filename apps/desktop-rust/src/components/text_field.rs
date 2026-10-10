use gpui_kit::component::input::Input;
use gpui_kit::component::{ActiveTheme, Sizable, v_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::*;

/// A labelled input; an error replaces the description.
pub fn text_field(
    label: &'static str,
    input: Input,
    description: Option<&'static str>,
    error: Option<&SharedString>,
    cx: &App,
) -> impl IntoElement {
    let theme = cx.theme();

    v_flex()
        .gap_1p5()
        .child(div().text_sm().font_weight(FontWeight::MEDIUM).child(label))
        .child(
            input
                .large()
                .h_12()
                .aria_label(label)
                .when(error.is_some(), |input| input.border_color(theme.danger)),
        )
        .map(|field| match (error, description) {
            (Some(error), _) => field.child(
                div()
                    .text_sm()
                    .text_color(theme.danger)
                    .child(error.clone()),
            ),
            (None, Some(description)) => field.child(
                div()
                    .text_sm()
                    .text_color(theme.muted_foreground)
                    .child(description),
            ),
            (None, None) => field,
        })
}
