import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/ui/appLayout";

export const Route = createFileRoute("/_authed/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <AppLayout>TEST</AppLayout>;
}
