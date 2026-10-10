use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::input::{Input, InputContentType, InputEvent, InputState};
use gpui_kit::component::{ActiveTheme, Disableable, Sizable, v_flex};
use gpui_kit::*;

use crate::api::auth::login;
use crate::components::auth_layout::auth_layout;
use crate::components::text_field::text_field;
use crate::runtime::Tokio;
use crate::store::session::Session;

pub struct LoginScreen {
    username: Entity<InputState>,
    password: Entity<InputState>,
    username_error: Option<SharedString>,
    password_error: Option<SharedString>,
    signing_in: Option<Task<()>>,
    _subscriptions: Vec<Subscription>,
}

impl LoginScreen {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let username = cx.new(|cx| InputState::new(window, cx));
        let password = cx.new(|cx| InputState::new(window, cx).masked(true));
        username.update(cx, |state, cx| state.focus(window, cx));

        let _subscriptions = vec![
            cx.subscribe_in(
                &username,
                window,
                |this, _, event, window, cx| match event {
                    InputEvent::Change => {
                        if this.username_error.take().is_some() {
                            cx.notify();
                        }
                    }
                    InputEvent::PressEnter { .. } => {
                        this.password
                            .update(cx, |state, cx| state.focus(window, cx));
                    }
                    _ => {}
                },
            ),
            cx.subscribe_in(
                &password,
                window,
                |this, _, event, window, cx| match event {
                    InputEvent::Change => {
                        if this.password_error.take().is_some() {
                            cx.notify();
                        }
                    }
                    InputEvent::PressEnter { .. } => this.submit(window, cx),
                    _ => {}
                },
            ),
        ];

        Self {
            username,
            password,
            username_error: None,
            password_error: None,
            signing_in: None,
            _subscriptions,
        }
    }

    fn has_errors(&self) -> bool {
        self.username_error.is_some() || self.password_error.is_some()
    }

    fn submit(&mut self, _: &mut Window, cx: &mut Context<Self>) {
        if self.signing_in.is_some() || self.has_errors() {
            return;
        }

        let username = self.username.read(cx).value().to_string();
        let password = self.password.read(cx).value().to_string();
        if username.is_empty() {
            self.username_error = Some("Enter your username".into());
        }
        if password.is_empty() {
            self.password_error = Some("Enter your password".into());
        }
        let Some(domain) = cx.global::<Session>().domain.clone() else {
            return;
        };
        if self.has_errors() {
            cx.notify();
            return;
        }

        let request = Tokio::spawn(cx, login(domain, username, password));
        self.signing_in = Some(cx.spawn(async move |this, cx| {
            let result = request.await;

            _ = this.update(cx, |this, cx| {
                this.signing_in = None;
                let error = match result {
                    Ok(Ok(token)) => Session::set_token(Some(token), cx)
                        .err()
                        .map(|error| format!("Couldn't save the sign-in: {error}").into()),
                    Ok(Err(error)) => Some(error.message().into()),
                    Err(_) => Some("Couldn't sign in. Try again.".into()),
                };
                this.password_error = error;
                cx.notify();
            });
        }));
        cx.notify();
    }
}

impl Render for LoginScreen {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let domain = cx.global::<Session>().domain.clone().unwrap_or_default();

        let fields = v_flex()
            .gap_4()
            .child(text_field(
                "Username",
                Input::new(&self.username).content_type(InputContentType::Username),
                None,
                self.username_error.as_ref(),
                cx,
            ))
            .child(text_field(
                "Password",
                Input::new(&self.password)
                    .content_type(InputContentType::Password)
                    .mask_toggle(),
                None,
                self.password_error.as_ref(),
                cx,
            ));

        let submit = Button::new("sign-in")
            .primary()
            .large()
            .h_12()
            .w_full()
            .rounded_full()
            .label("Sign in")
            .loading(self.signing_in.is_some())
            .disabled(self.has_errors())
            .on_click(cx.listener(|this, _, window, cx| this.submit(window, cx)));

        let server = v_flex()
            .items_center()
            .gap_1()
            .p_4()
            .rounded_2xl()
            .bg(theme.muted)
            .child(
                div()
                    .text_xs()
                    .text_color(theme.muted_foreground)
                    .child("Server"),
            )
            .child(
                div()
                    .max_w_full()
                    .truncate()
                    .text_sm()
                    .font_weight(FontWeight::MEDIUM)
                    .child(domain),
            )
            .child(
                Button::new("change-server")
                    .ghost()
                    .h_10()
                    .rounded_full()
                    .label("Change server")
                    .on_click(|_, _, cx| {
                        if let Err(error) = Session::set_domain(None, cx) {
                            eprintln!("Couldn't clear the server address: {error}");
                        }
                    }),
            );

        auth_layout(
            "Welcome back",
            "Sign in to listen to your music library.",
            v_flex().gap_8().child(fields).child(submit).child(server),
            cx,
        )
    }
}
