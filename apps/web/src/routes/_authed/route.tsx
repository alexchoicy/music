import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";
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
		<SidebarProvider>
			<AppSidebar />
			<Outlet />
		</SidebarProvider>
	);
}
