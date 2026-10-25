import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { create } from "zustand";

import type { PlaybackDevice } from "@/lib/webSocket";

export const maxDeviceNameLength = 64;

export type PendingTransfer = {
	requestId: string;
	deviceId: string;
	sessionId: string;
	/** True once the queue arrived and this phone is loading it. */
	preparing: boolean;
};

type PlaybackDeviceState = {
	/** Identifies this phone to the user's other players; unrelated to sign-in. */
	deviceId: string;
	/** Null uses the default name. */
	deviceName: string | null;
	connected: boolean;
	devices: PlaybackDevice[];
	discordDeviceId: string | null;
	transfer: PendingTransfer | null;
	setDeviceName: (name: string) => void;
	setDevices: (
		devices: PlaybackDevice[],
		discordDeviceId: string | null,
	) => void;
	setConnected: (connected: boolean) => void;
	setTransfer: (transfer: PendingTransfer | null) => void;
};

const storageKey = "playbackDevice";

type SavedIdentity = { deviceId: string; deviceName: string | null };

/** A random version 4 UUID; the server reads device and request IDs as GUIDs. */
export function createId() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = Math.floor(Math.random() * 16);
		return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
	});
}

function loadIdentity(): SavedIdentity {
	const saved = Storage.getItemSync(storageKey);
	if (saved) return JSON.parse(saved) as SavedIdentity;
	const identity: SavedIdentity = { deviceId: createId(), deviceName: null };
	Storage.setItemSync(storageKey, JSON.stringify(identity));
	return identity;
}

/** e.g. "Pixel 8" on Android, "iPhone" on iOS. */
export function getDefaultDeviceName() {
	if (Platform.OS === "android") return Platform.constants.Model || "Android";
	if (Platform.OS === "ios") {
		return Platform.constants.interfaceIdiom === "pad" ? "iPad" : "iPhone";
	}
	return "Phone";
}

export function normalizeDeviceName(name: string) {
	return name.trim().slice(0, maxDeviceNameLength).trim();
}

export const usePlaybackDeviceStore = create<PlaybackDeviceState>()(
	(set, get) => ({
		...loadIdentity(),
		connected: false,
		devices: [],
		discordDeviceId: null,
		transfer: null,
		setDeviceName: (name) => {
			const deviceName = normalizeDeviceName(name) || null;
			Storage.setItemSync(
				storageKey,
				JSON.stringify({ deviceId: get().deviceId, deviceName }),
			);
			set({ deviceName });
		},
		setDevices: (devices, discordDeviceId) => set({ devices, discordDeviceId }),
		setConnected: (connected) =>
			set(connected ? { connected } : { connected, devices: [] }),
		setTransfer: (transfer) => set({ transfer }),
	}),
);
