use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::input::{Input, InputContentType, InputEvent, InputState};
use gpui_kit::component::{Disableable, Sizable, v_flex};
use gpui_kit::*;

use crate::api::server::{check_server, is_valid_domain};
use crate::components::auth_layout::auth_layout;
use crate::components::text_field::text_field;
use crate::runtime::Tokio;
use crate::store::session::Session;

pub struct SetupScreen {
    domain: Entity<InputState>,
    error: Option<SharedString>,
    checking: Option<Task<()>>,
    _subscription: Subscription,
}

impl SetupScreen {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let domain = cx.new(|cx| InputState::new(window, cx).placeholder("music.example.com"));
        domain.update(cx, |state, cx| state.focus(window, cx));

        let _subscription = cx.subscribe_in(&domain, window, |this, _, event, window, cx| {
            match event {
                // As on the phone, an error stays until the address is edited.
                InputEvent::Change => {
                    if this.error.take().is_some() {
                        cx.notify();
                    }
                }
                InputEvent::PressEnter { .. } => this.submit(window, cx),
                _ => {}
            }
        });

        Self {
            domain,
            error: None,
            checking: None,
            _subscription,
        }
    }

    fn submit(&mut self, _: &mut Window, cx: &mut Context<Self>) {
        if self.checking.is_some() || self.error.is_some() {
            return;
        }

        let domain = self.domain.read(cx).value().to_string();
        if domain.is_empty() {
            self.set_error("Enter your server's address", cx);
            return;
        }
        if !is_valid_domain(&domain) {
            self.set_error("Enter a domain, like music.example.com", cx);
            return;
        }

        let check = Tokio::spawn(cx, check_server(domain.clone()));
        self.checking = Some(cx.spawn(async move |this, cx| {
            let reachable = check.await.unwrap_or(false);

            _ = this.update(cx, |this, cx| {
                this.checking = None;
                if !reachable {
                    this.set_error("Couldn't reach a Music server there", cx);
                } else if let Err(error) = Session::set_domain(Some(domain), cx) {
                    this.set_error(format!("Couldn't save the server address: {error}"), cx);
                }
                cx.notify();
            });
        }));
        cx.notify();
    }

    fn set_error(&mut self, message: impl Into<SharedString>, cx: &mut Context<Self>) {
        self.error = Some(message.into());
        cx.notify();
    }
}

impl Render for SetupScreen {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let field = text_field(
            "Server address",
            Input::new(&self.domain).content_type(InputContentType::Url),
            Some("For example, music.example.com"),
            self.error.as_ref(),
            cx,
        );

        let submit = Button::new("continue")
            .primary()
            .large()
            .h_12()
            .w_full()
            .rounded_full()
            .label("Continue")
            .loading(self.checking.is_some())
            .disabled(self.error.is_some())
            .on_click(cx.listener(|this, _, window, cx| this.submit(window, cx)));

        auth_layout(
            "Connect to your library",
            "Enter the address of your Music server to get started.",
            v_flex().gap_8().child(field).child(submit),
            cx,
        )
    }
}
