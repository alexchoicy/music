import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";
import { AudioPlayer } from "@/components/ui/audioPlayer";
import { AudioPlayerProvider } from "@/contexts/audioPlayerContext";
import { authQueries } from "@/lib/queries/auth.queries";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context }) => {
		const status = await context.queryClient.fetchQuery(
			authQueries.checkAuth(),
		);
		if (!status) throw redirect({ to: "/login" });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AudioPlayerProvider>
			<SidebarProvider>
				<AppSidebar />
				<div className="grid h-screen min-h-0 w-full grid-rows-[1fr_auto]">
					<div className="min-h-0 overflow-y-auto">
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
