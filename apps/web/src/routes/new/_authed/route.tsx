import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { NewShell } from "#/components/new/NewShell";
import { UserInfoProvider } from "#/context/UserInfoContext";
import { getResolvedApiEndpoint } from "#/lib/APIFetchClient";
import { authQueries } from "#/lib/queries/auth.queries";
import { checkBotHeader } from "#/lib/ServerFunction/checkBotHeader";
import { getWebSocketEndpoint } from "#/lib/ServerFunction/getApiEndpoint";
import { connectMusicWebSocket } from "#/lib/webSocket";
import { useUploadStore } from "#/store/uploadStore";

const searchSchema = z.object({ command: z.string().optional() });

export const Route = createFileRoute("/new/_authed")({
	beforeLoad: async ({ context, location }) => {
		const albumMatch = location.pathname.match(/^\/new\/albums\/([^/]+)\/?$/);
		const track = Number((location.search as Record<string, unknown>).track);
		if (albumMatch && import.meta.env.SSR && (await checkBotHeader())) {
			throw redirect({
				params: { id: albumMatch[1] },
				replace: true,
				search: Number.isFinite(track) ? { track } : undefined,
				to: "/bot/albums/$id",
			});
		}

		const authenticated = await context.queryClient.fetchQuery(
			authQueries.checkAuth(),
		);
		if (!authenticated) {
			throw redirect({
				to: "/new/login",
				search: { redirect: location.href },
			});
		}
		await context.queryClient.ensureQueryData(authQueries.userInfo());
	},
	validateSearch: searchSchema,
	head: async () => {
		const apiBaseUrl = await getResolvedApiEndpoint();
		return {
			links: [
				{
					href: `${apiBaseUrl}/search/opensearch`,
					rel: "search",
					title: "Music",
					type: "application/opensearchdescription+xml",
				},
			],
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { command } = Route.useSearch();
	const isUploading = useUploadStore((state) => state.isRunning);

	useEffect(() => {
		if (!isUploading) return;
		const blockUnload = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", blockUnload);
		return () => window.removeEventListener("beforeunload", blockUnload);
	}, [isUploading]);

	useEffect(() => {
		let disconnect: (() => void) | undefined;
		let disposed = false;
		void getWebSocketEndpoint().then((endpoint) => {
			if (!disposed) disconnect = connectMusicWebSocket(`${endpoint}/ws`);
		});
		return () => {
			disposed = true;
			disconnect?.();
		};
	}, []);

	return (
		<UserInfoProvider>
			<NewShell commandQuery={command}>
				<Outlet />
			</NewShell>
		</UserInfoProvider>
	);
}
