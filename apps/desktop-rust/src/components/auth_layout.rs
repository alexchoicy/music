use gpui_kit::component::{ActiveTheme, v_flex};
use gpui_kit::*;

use crate::components::logo::logo;

/// The centered brand, title and description shared by setup and sign-in.
pub fn auth_layout(
    title: impl Into<SharedString>,
    description: impl Into<SharedString>,
    content: impl IntoElement,
    cx: &App,
) -> impl IntoElement {
    let theme = cx.theme();

    div()
        .id("auth-layout")
        .size_full()
        .overflow_y_scroll()
        .bg(theme.background)
        .text_color(theme.foreground)
        .child(
            v_flex()
                .min_h_full()
                .justify_center()
                .items_center()
                .p_6()
                .child(
                    v_flex()
                        .w_full()
                        .max_w(px(384.))
                        .gap_8()
                        .child(
                            v_flex()
                                .gap_4()
                                .child(logo(px(56.), px(30.), px(16.), cx))
                                .child(
                                    v_flex()
                                        .gap_1p5()
                                        .child(
                                            div()
                                                .text_3xl()
                                                .font_weight(FontWeight::BOLD)
                                                .child(title.into()),
                                        )
                                        .child(
                                            div()
                                                .text_base()
                                                .line_height(rems(1.5))
                                                .text_color(theme.muted_foreground)
                                                .child(description.into()),
                                        ),
                                ),
                        )
                        .child(content),
                ),
        )
}
