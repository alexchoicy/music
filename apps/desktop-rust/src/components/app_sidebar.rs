use std::rc::Rc;

use gpui_kit::assets::IconName;
use gpui_kit::component::kbd::Kbd;
use gpui_kit::component::menu::{DropdownMenu as _, PopupMenuItem};
use gpui_kit::component::sidebar::{
    Sidebar, SidebarCollapsible, SidebarFooter, SidebarGroup, SidebarHeader, SidebarItem,
    SidebarMenu, SidebarMenuItem,
};
use gpui_kit::component::{ActiveTheme, Collapsible, Icon, h_flex, v_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::*;

use crate::api::sidebar::SidebarData;
use crate::components::logo::logo;
use crate::format::initials;
use crate::route::{Navigate, Route};

pub type Logout = Rc<dyn Fn(&mut Window, &mut App)>;

pub const SIDEBAR_WIDTH: Pixels = px(256.);

const NAVIGATION: [(&str, IconName, Route, Option<&str>); 6] = [
    ("Home", IconName::House, Route::Home, Some("1")),
    ("Albums", IconName::Disc3, Route::Albums, Some("2")),
    ("Parties", IconName::UsersRound, Route::Parties, Some("3")),
    ("Concerts", IconName::MicVocal, Route::Concerts, Some("4")),
    ("Playlists", IconName::ListMusic, Route::Playlists, None),
    ("History", IconName::RotateCcwClock, Route::History, None),
];

pub fn app_sidebar(
    route: &Route,
    data: Option<&SidebarData>,
    navigate: &Navigate,
    logout: Logout,
    cx: &App,
) -> impl IntoElement {
    let navigation =
        SidebarMenu::new().children(NAVIGATION.map(|(label, icon, target, hotkey)| {
            let navigate = navigate.clone();
            let active = *route == target;
            SidebarMenuItem::new(label)
                .icon(Icon::new(icon))
                .active(active)
                .on_click(move |_, window, cx| navigate(target.clone(), window, cx))
                .when_some(hotkey, |item, hotkey| {
                    item.suffix(move |_, _| {
                        Kbd::new(Keystroke::parse(hotkey).expect("valid hotkey"))
                    })
                })
        }));

    let playlists = SidebarMenu::new().children(data.into_iter().flat_map(|data| {
        data.playlists.iter().map(|playlist| {
            let navigate = navigate.clone();
            let target = Route::Playlist {
                id: playlist.playlist_id,
                name: playlist.name.clone().into(),
            };
            SidebarMenuItem::new(playlist.name.clone())
                .active(*route == target)
                .on_click(move |_, window, cx| navigate(target.clone(), window, cx))
        })
    }));

    let header = SidebarHeader::new().child(
        h_flex()
            .gap_2p5()
            .child(logo(px(32.), px(18.), px(8.), cx))
            .child(
                div()
                    .text_sm()
                    .font_weight(FontWeight::SEMIBOLD)
                    .child("Music"),
            ),
    );

    Sidebar::new("sidebar")
        .w(SIDEBAR_WIDTH)
        .collapsible(SidebarCollapsible::None)
        .header(header)
        .child(SidebarSection::Menu(Box::new(navigation)))
        .child(SidebarSection::Group(
            SidebarGroup::new("Playlists").child(playlists),
        ))
        .footer(account(data, logout, cx))
}

/// The signed-in user, with the account menu.
fn account(data: Option<&SidebarData>, logout: Logout, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let name = data
        .map(|data| data.user.user_name.trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "User".into());
    let role = data
        .map(|data| data.user.roles.join(", "))
        .filter(|roles| !roles.is_empty())
        .unwrap_or_else(|| "Member".into());

    SidebarFooter::new()
        .child(
            h_flex()
                .w_full()
                .gap_2()
                .child(
                    h_flex()
                        .flex_none()
                        .size_8()
                        .justify_center()
                        .rounded_full()
                        .border_1()
                        .border_color(theme.border)
                        .text_xs()
                        .font_weight(FontWeight::MEDIUM)
                        .child(initials(&name)),
                )
                .child(
                    v_flex()
                        .flex_1()
                        .min_w_0()
                        .child(
                            div()
                                .truncate()
                                .text_sm()
                                .font_weight(FontWeight::SEMIBOLD)
                                .child(name),
                        )
                        .child(
                            div()
                                .truncate()
                                .text_xs()
                                .text_color(theme.muted_foreground)
                                .child(role),
                        ),
                )
                .child(Icon::new(IconName::EllipsisVertical).size_4()),
        )
        .dropdown_menu_with_anchor(Anchor::BottomLeft, move |menu, _, _| {
            let logout = logout.clone();
            menu.item(
                PopupMenuItem::new("Log out")
                    .icon(Icon::new(IconName::LogOut))
                    .on_click(move |_, window, cx| logout(window, cx)),
            )
        })
}

/// The navigation has no group label, unlike the playlists.
#[derive(Clone)]
enum SidebarSection {
    Menu(Box<SidebarMenu>),
    Group(SidebarGroup<SidebarMenu>),
}

impl Collapsible for SidebarSection {
    fn is_collapsed(&self) -> bool {
        match self {
            Self::Menu(menu) => menu.is_collapsed(),
            Self::Group(group) => group.is_collapsed(),
        }
    }

    fn collapsed(self, collapsed: bool) -> Self {
        match self {
            Self::Menu(menu) => Self::Menu(Box::new(menu.collapsed(collapsed))),
            Self::Group(group) => Self::Group(group.collapsed(collapsed)),
        }
    }
}

impl SidebarItem for SidebarSection {
    fn render(
        self,
        id: impl Into<ElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> impl IntoElement {
        match self {
            Self::Menu(menu) => (*menu).render(id, window, cx).into_any_element(),
            Self::Group(group) => group.render(id, window, cx).into_any_element(),
        }
    }
}
