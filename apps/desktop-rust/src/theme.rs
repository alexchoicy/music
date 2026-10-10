use gpui_kit::App;
use gpui_kit::component::{Theme, ThemeRegistry};

pub fn init_theme(cx: &mut App) {
    let registry = ThemeRegistry::global_mut(cx);
    registry
        .load_themes_from_str(include_str!("../assets/theme.json"))
        .expect("bundled theme is valid");
    let light = registry.themes()["Music Light"].clone();
    let dark = registry.themes()["Music Dark"].clone();

    Theme::update(cx, |theme| {
        theme.light_theme = light;
        theme.dark_theme = dark;
    });
    Theme::sync_system_appearance(None, cx);
}
