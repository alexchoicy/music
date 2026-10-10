import "@/global.css";
import * as Sentry from "@sentry/react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useCSSVariable, useUniwind } from "uniwind";

import { TrackActionsHost } from "@/components/tracks/trackActions";
import { ConfirmDialogHost } from "@/components/ui/confirmDialog";
import { connectPlaybackDevice } from "@/lib/playbackDevices";
import {
	queryCacheMaxAge,
	queryClient,
	queryPersister,
} from "@/lib/queryClient";
import { startDownloads } from "@/offline/downloads";
import { useSessionStore } from "@/store/sessionStore";

Sentry.init({
	enabled: !__DEV__,
	dsn: "https://81016ec2f118c057b1207a17ffe502a7@o4506760346468352.ingest.us.sentry.io/4512213805432832",

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Enable Logs
	enableLogs: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [
		Sentry.mobileReplayIntegration(),
		// Sends console warnings and errors, including React Native's, as logs.
		Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
	],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});
export default Sentry.wrap(RootLayout);

function RootLayout() {
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const isSignedIn = useSessionStore((state) => state.token !== null);

	useEffect(() => {
		if (!isSignedIn) return;
		startDownloads();
		return connectPlaybackDevice();
	}, [isSignedIn]);

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister: queryPersister,
				maxAge: queryCacheMaxAge,
				// Data from another server must not be restored.
				buster: serverUrl ?? "",
				// Keeps data whose last refetch failed, e.g. while offline.
				dehydrateOptions: {
					shouldDehydrateQuery: (query) => query.state.data !== undefined,
				},
			}}
		>
			{/* Drag gestures, e.g. reordering the queue, need a gesture root. */}
			<GestureHandlerRootView style={{ flex: 1 }}>
				<NavigationTheme>
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Protected guard={isSignedIn}>
							<Stack.Screen name="(tabs)" />
						</Stack.Protected>
						<Stack.Protected guard={serverUrl !== null && !isSignedIn}>
							<Stack.Screen name="login" />
						</Stack.Protected>
						<Stack.Protected guard={serverUrl === null}>
							<Stack.Screen name="setup" />
						</Stack.Protected>
					</Stack>
				</NavigationTheme>
				{isSignedIn && <TrackActionsHost />}
				<ConfirmDialogHost />
			</GestureHandlerRootView>
			<StatusBar style="auto" />
		</PersistQueryClientProvider>
	);
}

/** Screens and transitions use the app background, so navigating never flashes the default white. */
function NavigationTheme({ children }: { children: ReactNode }) {
	const { theme } = useUniwind();
	const background = String(useCSSVariable("--color-background"));
	const base = theme === "dark" ? DarkTheme : DefaultTheme;

	useEffect(() => {
		void SystemUI.setBackgroundColorAsync(background);
	}, [background]);

	return (
		<ThemeProvider
			value={{
				...base,
				colors: { ...base.colors, background, card: background },
			}}
		>
			{children}
		</ThemeProvider>
	);
}
