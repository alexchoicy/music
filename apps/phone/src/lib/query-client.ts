import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import Storage from "expo-sqlite/kv-store";
import { AppState } from "react-native";

onlineManager.setEventListener((setOnline) => {
	// The listener only reports changes, so read the state the app starts with.
	void Network.getNetworkStateAsync().then((state) => {
		setOnline(!!state.isConnected);
	});
	const subscription = Network.addNetworkStateListener((state) => {
		setOnline(!!state.isConnected);
	});
	return () => subscription.remove();
});

AppState.addEventListener("change", (status) => {
	focusManager.setFocused(status === "active");
});

/** How long browsed data stays available offline. */
export const queryCacheMaxAge = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
	// Persisted queries are dropped once garbage collected, so keep them as long as the cache.
	defaultOptions: { queries: { gcTime: queryCacheMaxAge } },
});

export const queryPersister = createAsyncStoragePersister({
	storage: Storage,
	key: "query-cache",
});
