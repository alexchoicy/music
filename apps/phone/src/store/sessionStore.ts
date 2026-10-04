import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const serverUrlKey = "serverUrl";
const tokenKey = "authToken";

type SessionState = {
	serverUrl: string | null;
	token: string | null;
	setServerUrl: (serverUrl: string | null) => Promise<void>;
	setToken: (token: string | null) => Promise<void>;
};

async function persist(key: string, value: string | null) {
	if (value === null) await SecureStore.deleteItemAsync(key);
	else await SecureStore.setItemAsync(key, value);
}

export const useSessionStore = create<SessionState>()((set) => ({
	serverUrl: SecureStore.getItem(serverUrlKey),
	token: SecureStore.getItem(tokenKey),
	setServerUrl: async (serverUrl) => {
		// A token is only valid for the server that issued it.
		await persist(tokenKey, null);
		await persist(serverUrlKey, serverUrl);
		set({ serverUrl, token: null });
	},
	setToken: async (token) => {
		await persist(tokenKey, token);
		set({ token });
	},
}));
