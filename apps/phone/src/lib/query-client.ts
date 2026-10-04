import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";

onlineManager.setEventListener((setOnline) => {
	const subscription = Network.addNetworkStateListener((state) => {
		setOnline(!!state.isConnected);
	});
	return () => subscription.remove();
});

AppState.addEventListener("change", (status) => {
	focusManager.setFocused(status === "active");
});

export const queryClient = new QueryClient();
