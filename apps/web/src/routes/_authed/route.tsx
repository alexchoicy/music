import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";
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
				<Outlet />
			</SidebarProvider>
		</AudioPlayerProvider>
	);
}
