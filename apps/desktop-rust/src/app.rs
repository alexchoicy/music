use gpui_kit::component::Theme;
use gpui_kit::*;

use crate::screens::login::LoginScreen;
use crate::screens::setup::SetupScreen;
use crate::screens::shell::Shell;
use crate::store::session::Session;

enum Screen {
    Setup(Entity<SetupScreen>),
    Login(Entity<LoginScreen>),
    Shell(Entity<Shell>),
}

/// Shows setup until a server is configured, then sign-in until there is a token.
pub struct MusicApp {
    screen: Screen,
    _subscriptions: Vec<Subscription>,
}

impl MusicApp {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        Self {
            screen: Self::next_screen(None, window, cx).expect("a screen for the session"),
            _subscriptions: vec![
                cx.observe_global_in::<Session>(window, |this, window, cx| {
                    if let Some(screen) = Self::next_screen(Some(&this.screen), window, cx) {
                        this.screen = screen;
                        cx.notify();
                    }
                }),
                cx.observe_window_appearance(window, |_, window, cx| {
                    Theme::sync_system_appearance(Some(window), cx);
                }),
            ],
        }
    }

    /// The screen the session calls for, or None to keep the current one and its state.
    fn next_screen(
        current: Option<&Screen>,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) -> Option<Screen> {
        let session = cx.global::<Session>();
        match (session.domain.is_some(), session.token.is_some(), current) {
            (false, _, Some(Screen::Setup(_)))
            | (true, false, Some(Screen::Login(_)))
            | (true, true, Some(Screen::Shell(_))) => None,
            (false, _, _) => Some(Screen::Setup(cx.new(|cx| SetupScreen::new(window, cx)))),
            (true, false, _) => Some(Screen::Login(cx.new(|cx| LoginScreen::new(window, cx)))),
            (true, true, _) => Some(Screen::Shell(cx.new(|cx| Shell::new(window, cx)))),
        }
    }
}

impl Render for MusicApp {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        match &self.screen {
            Screen::Setup(setup) => setup.clone().into_any_element(),
            Screen::Login(login) => login.clone().into_any_element(),
            Screen::Shell(shell) => shell.clone().into_any_element(),
        }
    }
}
