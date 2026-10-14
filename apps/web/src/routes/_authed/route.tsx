import { useHotkey } from "@tanstack/react-hotkeys";
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { AppSidebar } from "#/components/app/AppSidebar";
import { MobileHeader } from "#/components/app/MobileHeader";
import { SearchCommand } from "#/components/app/SearchCommand";
import { suppressNativeContextMenu } from "#/components/app/suppressNativeContextMenu";
import { ScrollArea } from "#/components/base/scroll-area";
import { SidebarInset, SidebarProvider } from "#/components/base/sidebar";
import { PlayerBar } from "#/components/player/PlayerBar";
import { UserInfoProvider } from "#/context/UserInfoContext";
import { getResolvedApiEndpoint } from "#/lib/APIFetchClient";
import { connectPlaybackDevice } from "#/lib/playbackDevices";
import { authQueries } from "#/lib/queries/auth.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import { checkBotHeader } from "#/lib/ServerFunction/checkBotHeader";
import { getWebSocketEndpoint } from "#/lib/ServerFunction/getApiEndpoint";
import { useUploadStore } from "#/store/uploadStore";

const authedSearchSchema = z.object({
	command: z.string().optional(),
});

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context, location }) => {
		const albumMatch = location.pathname.match(/^\/albums\/([^/]+)\/?$/);
		const track = Number((location.search as Record<string, unknown>).track);

		if (albumMatch && import.meta.env.SSR) {
			const isBot = await checkBotHeader();

			if (isBot) {
				throw redirect({
					params: { id: albumMatch[1] },
					replace: true,
					search: Number.isFinite(track) ? { track } : undefined,
					to: "/bot/albums/$id",
				});
			}
		}

		const isAuthenticated = await context.queryClient.query(
			authQueries.checkAuth(),
		);

		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		const userInfo = await context.queryClient.query({
			...authQueries.userInfo(),
			staleTime: "static",
		});
		return { userInfo };
	},
	loader: ({ context }) =>
		context.queryClient.query({
			...playlistQueries.list(context.userInfo.id),
			staleTime: "static",
		}),
	validateSearch: authedSearchSchema,
	head: async () => {
		const apiBaseUrl = await getResolvedApiEndpoint();
		return {
			links: [
				{
					href: `${apiBaseUrl}/search/opensearch`,
					rel: "search",
					title: "Music",
					type: "application/opensearchdescription+xml",
				},
			],
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { command } = Route.useSearch();
	const [commandQuery, setCommandQuery] = useState<string>();
	const [openCommand, setOpenCommand] = useState(false);
	const playerRef = useRef<HTMLDivElement>(null);
	const [playerHeight, setPlayerHeight] = useState(0);

	// The player floats over the page; pad the page so its end can scroll clear.
	useEffect(() => {
		const player = playerRef.current;
		if (!player) return;
		const observer = new ResizeObserver(() => {
			setPlayerHeight(player.offsetHeight);
		});
		observer.observe(player);
		setPlayerHeight(player.offsetHeight);
		return () => observer.disconnect();
	}, []);
	const isUploading = useUploadStore((state) => state.isRunning);
	const navigator = useNavigate();
	useHotkey("Control+K", () => {
		setOpenCommand((open) => !open);
	});

	useHotkey("1", () => {
		navigator({ to: "/" });
	});
	useHotkey("2", () => {
		navigator({ to: "/albums" });
	});
	useHotkey("3", () => {
		navigator({ to: "/parties" });
	});
	useHotkey("4", () => {
		navigator({ to: "/concerts" });
	});

	useEffect(() => {
		const query = command?.trim();
		if (!query) return;

		setCommandQuery(query);
		setOpenCommand(true);
	}, [command]);

	useEffect(() => {
		if (!isUploading) return;

		const blockUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};

		window.addEventListener("beforeunload", blockUnload);
		return () => window.removeEventListener("beforeunload", blockUnload);
	}, [isUploading]);

	useEffect(() => {
		let disconnect: (() => void) | undefined;
		let disposed = false;

		void getWebSocketEndpoint().then((endpoint) => {
			if (disposed) return;

			disconnect = connectPlaybackDevice(`${endpoint}/ws`);
		});

		return () => {
			disposed = true;
			disconnect?.();
		};
	}, []);

	return (
		<UserInfoProvider>
			<SidebarProvider onContextMenu={suppressNativeContextMenu}>
				<AppSidebar onOpenSearch={() => setOpenCommand(true)} />
				<SidebarInset className="h-svh overflow-hidden">
					<MobileHeader onOpenSearch={() => setOpenCommand(true)} />
					<div className="relative flex min-h-0 flex-1 flex-col">
						<ScrollArea className="min-h-0 flex-1" id="app-scroll-area">
							<div style={{ paddingBottom: playerHeight }}>
								<Outlet />
							</div>
						</ScrollArea>
						<div
							className="pointer-events-none absolute inset-x-0 bottom-0 z-20 *:pointer-events-auto"
							ref={playerRef}
						>
							<PlayerBar />
						</div>
					</div>
				</SidebarInset>
				<SearchCommand
					initialQuery={commandQuery}
					onOpenChange={setOpenCommand}
					open={openCommand}
				/>
			</SidebarProvider>
		</UserInfoProvider>
	);
}
