import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/ui/appSidebar";

export const Route = createFileRoute("/_authed")({
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
