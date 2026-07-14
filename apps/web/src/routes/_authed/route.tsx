import { useHotkey } from "@tanstack/react-hotkeys";
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { ScrollArea } from "#/components/coss/scroll-area";
import { SidebarInset, SidebarProvider } from "#/components/coss/sidebar";
import { AppSidebar } from "#/components/ui/appSidebar";
import { AudioPlayer } from "#/components/ui/audioPlayer";
import { Command } from "#/components/ui/command";
import { MobileHeader } from "#/components/ui/mobileHeader";
import { UserInfoProvider } from "#/context/UserInfoContext";
import { getResolvedApiEndpoint } from "#/lib/APIFetchClient";
import { authQueries } from "#/lib/queries/auth.queries";
import { checkBotHeader } from "#/lib/ServerFunction/checkBotHeader";
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

		const isAuthenticated = await context.queryClient.fetchQuery(
			authQueries.checkAuth(),
		);

		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		await context.queryClient.ensureQueryData(authQueries.userInfo());
	},
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

	return (
		<UserInfoProvider>
			<SidebarProvider>
				<AppSidebar onOpenCommand={() => setOpenCommand(true)} />
				<SidebarInset className="h-svh overflow-hidden">
					<MobileHeader onOpenCommand={() => setOpenCommand(true)} />
					<div className="relative flex min-h-0 flex-1 flex-col">
						<ScrollArea className="min-h-0 flex-1" id="app-scroll-area">
							<Outlet />
						</ScrollArea>
						<AudioPlayer />
					</div>
				</SidebarInset>
				<Command
					initialQuery={commandQuery}
					onOpenChange={setOpenCommand}
					open={openCommand}
				/>
			</SidebarProvider>
		</UserInfoProvider>
	);
}
