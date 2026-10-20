import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import {
	RouteError,
	RouteNotFound,
	RoutePending,
} from "./components/app/RouteStates";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { authQueries } from "./lib/queries/auth.queries";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext({
		onUnauthorized: () => {
			if (import.meta.env.SSR) return;
			const location = router.latestLocation;
			if (location.pathname === "/login") return;

			context.queryClient.removeQueries({
				queryKey: authQueries.userInfo().queryKey,
			});
			void router.navigate({
				to: "/login",
				search: { redirect: location.href },
			});
		},
	});

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		scrollToTopSelectors: [
			'#app-scroll-area [data-slot="scroll-area-viewport"]',
		],
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: RouteNotFound,
		defaultErrorComponent: RouteError,
		defaultPendingComponent: RoutePending,
		defaultPendingMs: 300,
		defaultPendingMinMs: 300,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
