import { TanStackDevtools } from "@tanstack/react-devtools";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { AnchoredToastProvider, ToastProvider } from "#/components/base/toast";
import { TooltipProvider } from "#/components/base/tooltip";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Alex Music App",
			},
		],
		links: [
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html className="dark" lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="relative font-sans">
				<TooltipProvider>
					<ToastProvider position="top-right">
						<AnchoredToastProvider>
							<div className="relative isolate flex min-h-svh flex-col">
								{children}
							</div>
						</AnchoredToastProvider>
					</ToastProvider>
				</TooltipProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
						hotkeysDevtoolsPlugin(),
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
