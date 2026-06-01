import { Link, useRouterState } from "@tanstack/react-router"
import {
	CirclePlus,
	Disc3,
	House,
	LogOut,
	MicVocal,
	MoreVertical,
	Search,
	Settings2,
	UsersRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "#/components/coss/button"
import { Kbd } from "#/components/coss/kbd"
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "#/components/coss/menu"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "#/components/coss/sidebar"
import { useUserInfo } from "#/Provider/userInfoProvider"
import type { FileRouteTypes } from "#/routeTree.gen"

type NavigationTo = Exclude<FileRouteTypes["to"], "/login">

type NavigationItem = {
	label: string
	icon: LucideIcon
	to: NavigationTo
}

function normalizePathname(pathname: string): string {
	return pathname === "/" ? pathname : pathname.replace(/\/$/, "")
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/)
	const initials =
		parts.length > 1
			? `${parts[0].charAt(0)}${parts[1].charAt(0)}`
			: parts[0].slice(0, 2)

	return initials.toUpperCase() || "?"
}

const mainNavigation = [
	{
		label: "Home",
		icon: House,
		to: "/",
	},
	{
		label: "Albums",
		icon: Disc3,
		to: "/",
	},
	{
		label: "Parties",
		icon: UsersRound,
		to: "/",
	},
	{
		label: "Concerts",
		icon: MicVocal,
		to: "/",
	},
	{
		label: "Create",
		icon: CirclePlus,
		to: "/create",
	},
] satisfies Array<NavigationItem>

export function AppSidebar(): React.ReactElement {
	const userInfo = useUserInfo()
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const currentPathname = normalizePathname(pathname)
	const activeNavigationIndex = mainNavigation.findIndex(
		(item) => item.to === currentPathname,
	)
	const displayName = userInfo.userName.trim() || "User"
	const roleLabel =
		userInfo.roles.length > 0 ? userInfo.roles.join(", ") : "Member"

	return (
		<Sidebar collapsible="offcanvas">
			<SidebarHeader className="gap-6 p-3">
				<div className="flex items-center gap-2.5">
					<img alt="" className="size-8 rounded-lg" src="/logo192.png" />
					<span className="text-sm font-semibold">Music</span>
				</div>

				<div className="relative hidden md:block">
					<Button
						aria-label="Open search"
						className="h-9 w-full justify-start px-3 text-muted-foreground"
						variant="outline"
					>
						<Search className="size-4" />
						<span>Search</span>
					</Button>
					<Kbd className="absolute top-1/2 right-2 -translate-y-1/2">
						Ctrl K
					</Kbd>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainNavigation.map((item, index) => {
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											isActive={index === activeNavigationIndex}
											render={<Link to={item.to} />}
										>
											<item.icon className="size-4" />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<Menu>
							<SidebarMenuButton
								className="h-auto py-2"
								render={<MenuTrigger aria-label="Open account menu" />}
								size="lg"
							>
								<div className="flex size-8 items-center justify-center rounded-full border text-xs font-medium">
									{getInitials(displayName)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-semibold">
										{displayName}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{roleLabel}
									</div>
								</div>
								<MoreVertical className="ms-auto size-4" />
							</SidebarMenuButton>

							<MenuPopup align="start" className="w-48" side="top">
								<MenuItem>
									<Settings2 className="size-4" />
									Settings
								</MenuItem>
								<MenuItem variant="destructive">
									<LogOut className="size-4" />
									Log out
								</MenuItem>
							</MenuPopup>
						</Menu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
