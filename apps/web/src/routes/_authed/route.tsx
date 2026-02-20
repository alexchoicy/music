import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";
import { AudioPlayer } from "@/components/ui/audioPlayer";
import { AudioPlayerProvider } from "@/contexts/audioPlayerContext";
import { authQueries } from "@/lib/queries/auth.queries";
import { checkBotHeader } from "@/lib/ServerFunction/checkBotHeader";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context, location }) => {
		const albumMatch = location.pathname.match(/^\/albums\/([^/]+)\/?$/);
		if (albumMatch) {
			const isBot = await checkBotHeader();

			if (isBot) {
				throw redirect({
					to: "/bot/albums/$id",
					params: { id: albumMatch[1] },
					replace: true,
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
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AudioPlayerProvider>
			<SidebarProvider>
				<AppSidebar />
				<div className="grid h-screen min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto] overflow-x-hidden">
					<div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
						<Outlet />
					</div>

					<div className="sticky bottom-0 z-50">
						<AudioPlayer />
					</div>
				</div>
			</SidebarProvider>
		</AudioPlayerProvider>
	);
}
