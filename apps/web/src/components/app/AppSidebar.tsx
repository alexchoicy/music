import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	CirclePlusIcon,
	CloudUploadIcon,
	Disc3Icon,
	HistoryIcon,
	HouseIcon,
	ListMusicIcon,
	LogOutIcon,
	MicVocalIcon,
	SearchIcon,
	Settings2Icon,
	UsersRoundIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppMark } from "#/components/app/AppMark";
import { Button } from "#/components/base/button";
import { Kbd, KbdGroup } from "#/components/base/kbd";
import {
	Menu,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuTrigger,
} from "#/components/base/menu";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/base/popover";
import { Progress } from "#/components/base/progress";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "#/components/base/sidebar";
import { PlaylistContextMenu } from "#/components/playlist/PlaylistContextMenu";
import { useUserInfo } from "#/context/UserInfoContext";
import { ROLE } from "#/enums/userEnums";
import { authMutations } from "#/lib/queries/auth.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import { getInitials } from "#/lib/utils/string";
import type { FileRouteTypes } from "#/routeTree.gen";
import { useUploadStore } from "#/store/uploadStore";

type NavigationItem = {
	label: string;
	icon: LucideIcon;
	to: Exclude<FileRouteTypes["to"], "/login">;
	// Matches the shortcut registered in the authed layout.
	hotkey?: string;
	uploader?: boolean;
	exact?: boolean;
};

const mainNavigation = [
	{ label: "Home", icon: HouseIcon, to: "/", hotkey: "1" },
	{ label: "Albums", icon: Disc3Icon, to: "/albums", hotkey: "2" },
	{ label: "Parties", icon: UsersRoundIcon, to: "/parties", hotkey: "3" },
	{ label: "Concerts", icon: MicVocalIcon, to: "/concerts", hotkey: "4" },
	{ label: "Create", icon: CirclePlusIcon, to: "/create", uploader: true },
	// A playlist page highlights that playlist in the Playlists group instead.
	{ label: "Playlists", icon: ListMusicIcon, to: "/playlists", exact: true },
	{ label: "History", icon: HistoryIcon, to: "/history" },
] satisfies NavigationItem[];

export function AppSidebar({ onOpenSearch }: { onOpenSearch: () => void }) {
	const userInfo = useUserInfo();
	const { isMobile, setOpenMobile } = useSidebar();
	const { data: playlists } = useSuspenseQuery(
		playlistQueries.list(userInfo.id),
	);
	const canUpload = !userInfo.roles.includes(ROLE.User);

	function closeMobileSidebar() {
		if (isMobile) setOpenMobile(false);
	}

	return (
		<Sidebar>
			<SidebarHeader>
				<div className="flex items-center justify-between gap-2 px-1">
					<Link
						className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
						onClick={closeMobileSidebar}
						to="/"
					>
						<AppMark />
						<span className="text-base font-semibold text-foreground">
							Music
						</span>
					</Link>
					{canUpload && <UploadStatus onNavigate={closeMobileSidebar} />}
				</div>
				<SidebarMenuButton
					aria-keyshortcuts="Control+K"
					onClick={() => {
						closeMobileSidebar();
						onOpenSearch();
					}}
					size="sm"
					variant="outline"
				>
					<SearchIcon aria-hidden="true" />
					<span className="truncate">Search</span>
					<KbdGroup
						aria-hidden="true"
						className="ms-auto hidden md:inline-flex"
					>
						<Kbd>Ctrl</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
				</SidebarMenuButton>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<nav aria-label="Main">
						<SidebarMenu>
							{mainNavigation.map((item) => {
								if (item.uploader && !canUpload) return null;
								return (
									<SidebarMenuItem key={item.to}>
										<SidebarMenuButton
											aria-keyshortcuts={item.hotkey}
											onClick={closeMobileSidebar}
											render={
												<Link
													activeOptions={{
														exact: item.exact ?? item.to === "/",
													}}
													activeProps={{
														"aria-current": "page",
														"data-active": "true",
													}}
													to={item.to}
												/>
											}
										>
											<item.icon aria-hidden="true" />
											<span className="truncate">{item.label}</span>
											{item.hotkey && (
												<Kbd
													aria-hidden="true"
													className="ms-auto hidden md:inline-flex"
												>
													{item.hotkey}
												</Kbd>
											)}
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</nav>
				</SidebarGroup>

				{playlists.length > 0 && (
					<SidebarGroup>
						<SidebarGroupLabel>Playlists</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{playlists.map((playlist) => (
									<SidebarMenuItem key={playlist.playlistId}>
										<PlaylistContextMenu
											playlist={playlist}
											render={
												<SidebarMenuButton
													onClick={closeMobileSidebar}
													render={
														<Link
															activeOptions={{ exact: true }}
															activeProps={{
																"aria-current": "page",
																"data-active": "true",
															}}
															params={{ id: String(playlist.playlistId) }}
															to="/playlists/$id"
														/>
													}
													size="sm"
												/>
											}
										>
											<span>{playlist.name}</span>
										</PlaylistContextMenu>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>

			<SidebarFooter>
				<AccountMenu onNavigate={closeMobileSidebar} />
			</SidebarFooter>
		</Sidebar>
	);
}

function AccountMenu({ onNavigate }: { onNavigate: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const userInfo = useUserInfo();
	const { isPending, mutateAsync: logout } = useMutation(
		authMutations.logout(),
	);
	const displayName = userInfo.userName.trim() || "User";

	async function handleLogout() {
		onNavigate();
		await logout();
		await navigate({ to: "/login", search: { redirect: "" } });
		queryClient.clear();
	}

	return (
		<Menu>
			<SidebarMenuButton
				render={<MenuTrigger aria-label={`Account menu for ${displayName}`} />}
				size="lg"
			>
				<span
					aria-hidden="true"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold"
				>
					{getInitials(displayName)}
				</span>
				<span className="font-semibold text-foreground">{displayName}</span>
			</SidebarMenuButton>
			<MenuPopup align="start" className="w-(--anchor-width)" side="top">
				<MenuLinkItem onClick={onNavigate} render={<Link to="/settings" />}>
					<Settings2Icon aria-hidden="true" />
					Settings
				</MenuLinkItem>
				<MenuItem
					disabled={isPending}
					onClick={() => void handleLogout()}
					variant="destructive"
				>
					<LogOutIcon aria-hidden="true" />
					{isPending ? "Logging out…" : "Log out"}
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}

function UploadStatus({ onNavigate }: { onNavigate: () => void }) {
	const navigate = useNavigate();
	const fileByBlake3 = useUploadStore((state) => state.fileByBlake3);
	const activeUploads = Object.entries(fileByBlake3).filter(
		([, record]) =>
			record.status === "Queued" ||
			record.status === "Uploading" ||
			record.status === "Failed",
	);

	return (
		<Popover
			onOpenChange={(_, details) => {
				if (details.reason === "trigger-press") details.cancel();
			}}
		>
			<PopoverTrigger
				closeDelay={150}
				delay={0}
				openOnHover
				render={
					<Button
						aria-label="Uploads"
						onClick={() => {
							onNavigate();
							void navigate({ to: "/uploads" });
						}}
						size="icon"
						variant="ghost"
					/>
				}
			>
				<CloudUploadIcon aria-hidden="true" />
				{activeUploads.length > 0 && (
					<span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
				)}
			</PopoverTrigger>
			<PopoverPopup align="end" className="w-64" side="right">
				<div className="grid gap-2 text-xs">
					<p className="font-medium text-foreground">Uploads</p>
					{activeUploads.length === 0 && (
						<p className="text-muted-foreground">No active uploads</p>
					)}
					{activeUploads.map(([blake3, upload]) => (
						<div className="grid min-w-0 gap-1" key={blake3}>
							<div className="flex min-w-0 items-center justify-between gap-3">
								<span className="min-w-0 truncate text-foreground">
									{upload.fileName}
								</span>
								<span className="shrink-0 text-muted-foreground">
									{upload.status}
								</span>
							</div>
							{upload.status === "Uploading" && (
								<Progress
									value={
										upload.totalPartCount > 0
											? Math.round(
													(upload.uploadedPartCount / upload.totalPartCount) *
														100,
												)
											: 0
									}
								/>
							)}
							{upload.status === "Failed" && upload.error && (
								<p className="truncate text-destructive-foreground">
									{upload.error}
								</p>
							)}
						</div>
					))}
				</div>
			</PopoverPopup>
		</Popover>
	);
}
