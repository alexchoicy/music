import { Link, useRouterState } from "@tanstack/react-router";
import {
	CirclePlus,
	Disc3,
	House,
	LogOut,
	MicVocal,
	MoreVertical,
	SearchIcon,
	Settings2,
	Upload,
	UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "#/components/coss/button";
import { Kbd, KbdGroup } from "#/components/coss/kbd";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "#/components/coss/menu";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/coss/popover";
import { Progress } from "#/components/coss/progress";
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
} from "#/components/coss/sidebar";
import { useUserInfo } from "#/context/UserInfoContext";
import { getInitials } from "#/lib/utils/string";
import type { FileRouteTypes } from "#/routeTree.gen";
import { useUploadStore } from "#/store/uploadStore";

type NavigationTo = Exclude<FileRouteTypes["to"], "/login">;

type AppSidebarProps = {
	onOpenCommand: () => void;
};

type NavigationItem = {
	label: string;
	icon: LucideIcon;
	to: NavigationTo;
	hotkey?: string;
};

function normalizePathname(pathname: string): string {
	return pathname === "/" ? pathname : pathname.replace(/\/$/, "");
}

const mainNavigation = [
	{
		label: "Home",
		icon: House,
		to: "/",
		hotkey: "1",
	},
	{
		label: "Albums",
		icon: Disc3,
		to: "/albums",
		hotkey: "2",
	},
	{
		label: "Parties",
		icon: UsersRound,
		to: "/parties",
		hotkey: "3",
	},
	{
		label: "Concerts",
		icon: MicVocal,
		to: "/concerts",
		hotkey: "4",
	},
	{
		label: "Create",
		icon: CirclePlus,
		to: "/create",
	},
] satisfies Array<NavigationItem>;

function SidebarUploadStatus(): React.ReactElement {
	const fileByBlake3 = useUploadStore((state) => state.fileByBlake3);
	const activeUploads = Object.entries(fileByBlake3).filter(
		([, record]) =>
			record.status === "queued" ||
			record.status === "uploading" ||
			record.status === "failed",
	);
	const hasActiveUpload = activeUploads.length > 0;

	return (
		<Popover>
			<PopoverTrigger
				closeDelay={150}
				delay={0}
				openOnHover
				render={
					<Button
						aria-label="Upload status"
						className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<Upload aria-hidden="true" className="size-4" />
				{hasActiveUpload && (
					<span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
				)}
			</PopoverTrigger>
			<PopoverPopup align="end" className="w-64" side="right">
				<div className="grid gap-2 text-xs">
					<div className="font-medium text-foreground">Uploads</div>
					{hasActiveUpload ? (
						activeUploads.map(([blake3, upload]) => {
							const value =
								upload.totalPartCount > 0
									? Math.round(
											(upload.uploadedPartCount / upload.totalPartCount) * 100,
										)
									: 0;

							return (
								<div className="grid min-w-0 gap-1" key={blake3}>
									<div className="flex min-w-0 items-center justify-between gap-3">
										<span className="min-w-0 truncate text-foreground">
											{upload.fileName}
										</span>
										<span className="shrink-0 text-muted-foreground capitalize">
											{upload.status}
										</span>
									</div>
									{upload.status === "uploading" && <Progress value={value} />}
									{upload.status === "failed" && upload.error && (
										<div className="min-w-0 truncate text-destructive">
											{upload.error}
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className="text-muted-foreground">No active uploads</div>
					)}
				</div>
			</PopoverPopup>
		</Popover>
	);
}

export function AppSidebar({
	onOpenCommand,
}: AppSidebarProps): React.ReactElement {
	const userInfo = useUserInfo();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const currentPathname = normalizePathname(pathname);
	const activeNavigationIndex = mainNavigation.findIndex(
		(item) => item.to === currentPathname,
	);
	const displayName = userInfo.userName.trim() || "User";
	const roleLabel =
		userInfo.roles.length > 0 ? userInfo.roles.join(", ") : "Member";

	return (
		<Sidebar collapsible="offcanvas">
			<SidebarHeader className="gap-6 p-3">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex items-center gap-2.5">
						<img alt="" className="size-8 rounded-lg" src="/logo192.png" />
						<span className="text-sm font-semibold">Music</span>
					</div>
					<SidebarUploadStatus />
				</div>

				<div className="hidden md:block">
					<Button
						className="h-9 w-full justify-start px-3 text-muted-foreground hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={onOpenCommand}
						variant="outline"
					>
						<SearchIcon aria-hidden="true" />
						Search
						<KbdGroup className="absolute top-1/2 right-2 -translate-y-1/2">
							<Kbd>⌘</Kbd>
							<Kbd>K</Kbd>
						</KbdGroup>
					</Button>
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
											{item.hotkey && (
												<KbdGroup className="absolute top-1/2 right-2 -translate-y-1/2">
													<Kbd>{item.hotkey}</Kbd>
												</KbdGroup>
											)}
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			{/*<SidebarSeparator />*/}

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
	);
}
