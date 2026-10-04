import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { queryClient } from "@/lib/query-client";
import { useSessionStore } from "@/store/sessionStore";

export default function RootLayout() {
	const hasServer = useSessionStore((state) => state.serverUrl !== null);
	const isSignedIn = useSessionStore((state) => state.token !== null);

	return (
		<QueryClientProvider client={queryClient}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Protected guard={isSignedIn}>
					<Stack.Screen name="(tabs)" />
				</Stack.Protected>
				<Stack.Protected guard={hasServer && !isSignedIn}>
					<Stack.Screen name="login" />
				</Stack.Protected>
				<Stack.Protected guard={!hasServer}>
					<Stack.Screen name="setup" />
				</Stack.Protected>
			</Stack>
			<StatusBar style="auto" />
		</QueryClientProvider>
	);
}
