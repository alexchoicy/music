import "@/global.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
	resumeDownloads,
	startPlayedTrackUpgrades,
} from "@/lib/offline/downloads";
import {
	queryCacheMaxAge,
	queryClient,
	queryPersister,
} from "@/lib/query-client";
import { useSessionStore } from "@/store/sessionStore";

export default function RootLayout() {
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const isSignedIn = useSessionStore((state) => state.token !== null);

	useEffect(() => {
		if (!isSignedIn) return;
		resumeDownloads();
		startPlayedTrackUpgrades();
	}, [isSignedIn]);

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister: queryPersister,
				maxAge: queryCacheMaxAge,
				// Data from another server must not be restored.
				buster: serverUrl ?? "",
				// Keep data whose last refetch failed, e.g. while offline.
				dehydrateOptions: {
					shouldDehydrateQuery: (query) => query.state.data !== undefined,
				},
			}}
		>
			{/* Drag gestures, e.g. reordering the queue, need a gesture root. */}
			<GestureHandlerRootView style={{ flex: 1 }}>
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
			</GestureHandlerRootView>
			<StatusBar style="auto" />
		</PersistQueryClientProvider>
	);
}
