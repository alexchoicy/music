import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authQueries } from "#/lib/queries/auth.queries";

export const Route = createFileRoute("/_authed/inbox")({
	beforeLoad: async ({ context }) => {
		const userInfo = await context.queryClient.ensureQueryData(
			authQueries.userInfo(),
		);

		if (!userInfo.roles.includes("Admin") && !userInfo.roles.includes("Owner"))
			throw redirect({ to: "/" });
	},
	component: Outlet,
});
