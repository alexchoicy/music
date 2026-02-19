import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";
import { AudioPlayer } from "@/components/ui/audioPlayer";
import { ApiEndpointProvider } from "@/contexts/apiEndpointContext";
import { AudioPlayerProvider } from "@/contexts/audioPlayerContext";
import { authQueries } from "@/lib/queries/auth.queries";
import { getApiEndpoint } from "@/lib/ServerFunction/getApiEndpoint";

export const Route = createFileRoute("/_authed")({
	loader: async ({ context }) => {
		const apiEndpoint = await getApiEndpoint();

		const status = await context.queryClient.fetchQuery(
			authQueries.checkAuth(apiEndpoint),
		);
		if (!status) throw redirect({ to: "/login" });

		return { apiEndpoint };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { apiEndpoint } = Route.useLoaderData();

	return (
		<ApiEndpointProvider apiEndpoint={apiEndpoint}>
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
		</ApiEndpointProvider>
	);
}
