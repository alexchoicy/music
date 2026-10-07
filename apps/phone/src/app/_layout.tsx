import "@/global.css";
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

export default function RootLayout() {
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
							<Stack.Screen
								name="player"
								options={{
									presentation: "modal",
									animation: "slide_from_bottom",
								}}
							/>
							<Stack.Screen
								name="queue"
								options={{
									presentation: "modal",
									animation: "slide_from_bottom",
								}}
							/>
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
