import { createFileRoute, redirect } from "@tanstack/react-router";

import { authQueries } from "#/lib/queries/auth.queries";
import { LoginPage } from "#/routes/_public/login/index";

export const Route = createFileRoute("/new/login")({
	validateSearch: (search) => ({
		redirect: (search.redirect as string) || "/new",
	}),
	beforeLoad: async ({ context, search }) => {
		const status = await context.queryClient.fetchQuery({
			...authQueries.checkAuth(),
			staleTime: 0,
		});
		if (status) throw redirect({ to: search.redirect });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect: redirectTo } = Route.useSearch();
	return <LoginPage newStyle redirectTo={redirectTo} />;
}
