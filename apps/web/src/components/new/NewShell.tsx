import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
	CirclePlusIcon,
	Disc3Icon,
	HeadphonesIcon,
	HouseIcon,
	LogOutIcon,
	MenuIcon,
	MicVocalIcon,
	SearchIcon,
	Settings2Icon,
	UploadCloudIcon,
	UsersRoundIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "#/components/coss/avatar";
import { Button } from "#/components/coss/button";
import { Kbd } from "#/components/coss/kbd";
import {
	Menu,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "#/components/coss/menu";
import { Progress } from "#/components/coss/progress";
import { ScrollArea } from "#/components/coss/scroll-area";
import {
	Sheet,
	SheetClose,
	SheetDescription,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
	SheetTrigger,
} from "#/components/coss/sheet";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/coss/tooltip";
import { useUserInfo } from "#/context/UserInfoContext";
import { ROLE } from "#/enums/userEnums";
import { authMutations } from "#/lib/queries/auth.queries";
import { getInitials } from "#/lib/utils/string";
import { cn } from "#/lib/utils/styles";
import { useUploadStore } from "#/store/uploadStore";

import { AudioPlayer } from "../ui/audioPlayer";
import { Command } from "../ui/command";

type NavItem = {
	icon: LucideIcon;
	label: string;
	to: "/new" | "/new/albums" | "/new/concerts" | "/new/create" | "/new/parties";
	uploader?: boolean;
};

const navItems: NavItem[] = [
	{ icon: HouseIcon, label: "Home", to: "/new" },
	{ icon: Disc3Icon, label: "Albums", to: "/new/albums" },
	{ icon: UsersRoundIcon, label: "Artists", to: "/new/parties" },
	{ icon: MicVocalIcon, label: "Concerts", to: "/new/concerts" },
	{ icon: CirclePlusIcon, label: "Create", to: "/new/create", uploader: true },
];

function Brand() {
	return (
		<Link
			className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
			to="/new"
		>
			<span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
				<HeadphonesIcon className="size-5" />
			</span>
			<span>
				<span className="block text-sm font-semibold tracking-tight">
					Music
				</span>
				<span className="block text-[10px] font-medium tracking-[.16em] text-muted-foreground uppercase">
					Archive
				</span>
			</span>
		</Link>
	);
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
	const user = useUserInfo();

	return navItems.map((item) => {
		if (item.uploader && user.roles.includes(ROLE.User)) return null;
		return (
			<Link
				activeOptions={{ exact: item.to === "/new" }}
				activeProps={{ "data-active": "true" }}
				className={cn(
					"group flex items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
					mobile
						? "flex-1 flex-col justify-center gap-1 px-1 py-2 text-[10px]"
						: "gap-3 px-3 py-2.5",
				)}
				key={item.to}
				to={item.to}
			>
				<item.icon className={cn("size-4", mobile && "size-5")} />
				<span>{item.label}</span>
			</Link>
		);
	});
}

function UploadStatus() {
	const fileByBlake3 = useUploadStore((state) => state.fileByBlake3);
	const active = Object.values(fileByBlake3).filter((upload) =>
		["Queued", "Uploading", "Failed"].includes(upload.status),
	);
	const uploading = active.find((upload) => upload.status === "Uploading");
	const progress = uploading?.totalPartCount
		? Math.round((uploading.uploadedPartCount / uploading.totalPartCount) * 100)
		: 0;

	return (
		<Link
			className="block rounded-xl border border-border/60 bg-card/50 p-3 transition outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
			to="/new/uploads"
		>
			<div className="flex items-center justify-between gap-3 text-xs">
				<span className="flex items-center gap-2 font-medium">
					<UploadCloudIcon className="size-4" />
					Uploads
				</span>
				<span className="text-muted-foreground">
					{active.length ? `${active.length} active` : "Ready"}
				</span>
			</div>
			{uploading ? <Progress className="mt-3" value={progress} /> : null}
		</Link>
	);
}

function AccountMenu() {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { isPending, mutateAsync: logout } = useMutation(
		authMutations.logout(),
	);
	const displayName = user.userName.trim() || "User";

	async function handleLogout() {
		await logout();
		queryClient.removeQueries({ queryKey: ["auth"] });
		await navigate({ to: "/new/login", search: { redirect: "/new" } });
	}

	return (
		<Menu>
			<MenuTrigger
				aria-label="Open account menu"
				render={
					<Button
						className="h-auto w-full justify-start gap-3 rounded-xl px-2 py-2"
						variant="ghost"
					/>
				}
			>
				<Avatar className="size-9">
					<AvatarFallback>{getInitials(displayName)}</AvatarFallback>
				</Avatar>
				<span className="min-w-0 flex-1 text-left">
					<span className="block truncate text-sm font-semibold">
						{displayName}
					</span>
					<span className="block truncate text-xs text-muted-foreground">
						{user.roles.join(", ") || "Member"}
					</span>
				</span>
			</MenuTrigger>
			<MenuPopup align="start" className="w-56" side="top">
				<MenuLinkItem render={<Link to="/new/settings" />}>
					<Settings2Icon />
					Settings
				</MenuLinkItem>
				<MenuLinkItem render={<Link to="/new/uploads" />}>
					<UploadCloudIcon />
					Uploads
				</MenuLinkItem>
				<MenuSeparator />
				<MenuItem
					disabled={isPending}
					onClick={() => void handleLogout()}
					variant="destructive"
				>
					<LogOutIcon />
					{isPending ? "Signing out…" : "Sign out"}
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}

function MobileDrawer({ onSearch }: { onSearch: () => void }) {
	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button aria-label="Open menu" size="icon-sm" variant="ghost" />
				}
			>
				<MenuIcon />
			</SheetTrigger>
			<SheetPopup side="left">
				<SheetHeader>
					<SheetTitle>Music Archive</SheetTitle>
					<SheetDescription>Browse and manage your library.</SheetDescription>
				</SheetHeader>
				<SheetPanel className="flex flex-col gap-5">
					<Button
						className="justify-start"
						onClick={onSearch}
						variant="outline"
					>
						<SearchIcon />
						Search library
					</Button>
					<nav className="grid gap-1">
						<NavLinks />
					</nav>
					<div className="mt-auto grid gap-3">
						<UploadStatus />
						<AccountMenu />
					</div>
					<SheetClose className="sr-only">Close menu</SheetClose>
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}

export function NewShell({
	children,
	commandQuery,
}: {
	children: React.ReactNode;
	commandQuery?: string;
}) {
	const [searchOpen, setSearchOpen] = useState(false);
	const location = useLocation();
	useHotkey("Control+K", () => setSearchOpen((open) => !open));
	useEffect(() => {
		document.body.classList.add("new-ui");
		return () => document.body.classList.remove("new-ui");
	}, []);
	useEffect(() => {
		if (commandQuery?.trim()) setSearchOpen(true);
	}, [commandQuery]);
	const currentTitle =
		navItems.find((item) =>
			item.to === "/new"
				? location.pathname === "/new" || location.pathname === "/new/"
				: location.pathname.startsWith(item.to),
		)?.label ??
		(location.pathname.includes("settings")
			? "Settings"
			: location.pathname.includes("uploads")
				? "Uploads"
				: "Music");

	return (
		<div className="new-ui flex h-svh min-w-0 overflow-hidden bg-background">
			<aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-card/35 p-4 lg:flex">
				<div className="px-2 py-1">
					<Brand />
				</div>
				<Button
					className="mt-7 justify-start text-muted-foreground"
					onClick={() => setSearchOpen(true)}
					variant="outline"
				>
					<SearchIcon />
					Search library
					<span className="ml-auto">
						<Kbd>⌘K</Kbd>
					</span>
				</Button>
				<p className="mt-8 mb-2 px-3 text-[10px] font-semibold tracking-[.18em] text-muted-foreground uppercase">
					Explore
				</p>
				<nav className="grid gap-1">
					<NavLinks />
				</nav>
				<div className="mt-auto grid gap-3">
					<UploadStatus />
					<AccountMenu />
				</div>
			</aside>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl lg:hidden">
					<div className="flex items-center gap-2">
						<MobileDrawer onSearch={() => setSearchOpen(true)} />
						<span className="text-sm font-semibold">{currentTitle}</span>
					</div>
					<div className="flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Search library"
										onClick={() => setSearchOpen(true)}
										size="icon-sm"
										variant="ghost"
									/>
								}
							>
								<SearchIcon />
							</TooltipTrigger>
							<TooltipPopup>Search library</TooltipPopup>
						</Tooltip>
						<Link
							aria-label="Settings"
							className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
							to="/new/settings"
						>
							<Settings2Icon className="size-4" />
						</Link>
					</div>
				</header>
				<div className="relative flex min-h-0 flex-1 flex-col pb-20 lg:pb-0">
					<ScrollArea className="min-h-0 flex-1" id="new-app-scroll-area">
						{children}
					</ScrollArea>
					<AudioPlayer />
				</div>
			</div>

			<nav className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-border/70 bg-background/90 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
				<NavLinks mobile />
			</nav>
			<Command
				initialQuery={commandQuery}
				onOpenChange={setSearchOpen}
				open={searchOpen}
				routePrefix="/new"
			/>
		</div>
	);
}
