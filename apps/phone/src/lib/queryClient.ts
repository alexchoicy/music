import * as Sentry from "@sentry/react-native";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
	focusManager,
	MutationCache,
	onlineManager,
	QueryCache,
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

function logRequestError(message: string, key: unknown, error: Error) {
	// Requests are expected to fail while offline.
	if (!onlineManager.isOnline()) return;
	Sentry.logger.warn(message, {
		key: JSON.stringify(key),
		error: error.message,
		// ApiError carries the response status; importing it here would be circular.
		status: "status" in error ? Number(error.status) : undefined,
	});
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) =>
			logRequestError("Query failed", query.queryKey, error),
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) =>
			logRequestError("Mutation failed", mutation.options.mutationKey, error),
	}),
	// Persisted queries are dropped once garbage collected, so keep them as long as the cache.
	defaultOptions: { queries: { gcTime: queryCacheMaxAge } },
});

export const queryPersister = createAsyncStoragePersister({
	storage: Storage,
	key: "query-cache",
});
