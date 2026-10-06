import { create } from "zustand";

import type { PlaybackDevice } from "#/data/webSocket";

export const MAX_DEVICE_NAME_LENGTH = 64;
export const PLAYBACK_DEVICE_STORAGE_KEY = "playback-device";

export type PendingTransfer = {
	requestId: string;
	deviceId: string;
	sessionId: string;
	// True once the snapshot arrived and this tab is loading it.
	preparing: boolean;
};

type PlaybackDeviceState = {
	// Mirrors localStorage, which is shared by every tab. It identifies the browser, not the user,
	// and is unrelated to login tokens.
	deviceId: string | null;
	deviceName: string | null;
	connected: boolean;
	devices: PlaybackDevice[];
	discordDeviceId: string | null;
	transfer: PendingTransfer | null;
};

type PlaybackDeviceAction = {
	loadIdentity: () => DeviceIdentity;
	setDeviceName: (name: string) => void;
	setDevices: (
		devices: PlaybackDevice[],
		discordDeviceId: string | null,
	) => void;
	setConnected: (connected: boolean) => void;
	setTransfer: (transfer: PendingTransfer | null) => void;
};

type DeviceIdentity = { deviceId: string; deviceName: string | null };

// Storage is only written when the ID is created or the device is renamed, so a tab holding
// an outdated copy never overwrites another tab's identity.
function readStoredIdentity(): Partial<DeviceIdentity> {
	try {
		const stored: unknown = JSON.parse(
			localStorage.getItem(PLAYBACK_DEVICE_STORAGE_KEY) ?? "null",
		);
		const state =
			stored && typeof stored === "object" && "state" in stored
				? (stored.state as Record<string, unknown> | null)
				: null;
		return {
			deviceId:
				typeof state?.deviceId === "string" && state.deviceId
					? state.deviceId
					: undefined,
			deviceName:
				typeof state?.deviceName === "string" && state.deviceName
					? state.deviceName
					: null,
		};
	} catch {
		return {};
	}
}

function writeStoredIdentity(identity: DeviceIdentity): void {
	localStorage.setItem(
		PLAYBACK_DEVICE_STORAGE_KEY,
		JSON.stringify({ state: identity, version: 0 }),
	);
}

// One per page load, so every tab is its own player session on the shared device.
let sessionId: string | null = null;

export function getSessionId(): string {
	sessionId ??= crypto.randomUUID();
	return sessionId;
}

export function getDefaultDeviceName(): string {
	const userAgent = navigator.userAgent;
	const browser = /Edg\//.test(userAgent)
		? "Edge"
		: /OPR\//.test(userAgent)
			? "Opera"
			: /Firefox\//.test(userAgent)
				? "Firefox"
				: /Chrome\//.test(userAgent)
					? "Chrome"
					: /Safari\//.test(userAgent)
						? "Safari"
						: "Browser";
	const os = /Android/.test(userAgent)
		? "Android"
		: /iPhone|iPad|iPod/.test(userAgent)
			? "iOS"
			: /Mac OS X/.test(userAgent)
				? "macOS"
				: /Windows/.test(userAgent)
					? "Windows"
					: /CrOS/.test(userAgent)
						? "ChromeOS"
						: /Linux/.test(userAgent)
							? "Linux"
							: null;

	return os ? `${browser} on ${os}` : browser;
}

export function normalizeDeviceName(name: string): string {
	return name.trim().slice(0, MAX_DEVICE_NAME_LENGTH).trim();
}

export const usePlaybackDeviceStore = create<
	PlaybackDeviceState & PlaybackDeviceAction
>()((set) => ({
	deviceId: null,
	deviceName: null,
	connected: false,
	devices: [],
	discordDeviceId: null,
	transfer: null,
	loadIdentity: () => {
		const stored = readStoredIdentity();
		const identity: DeviceIdentity = {
			deviceId: stored.deviceId ?? crypto.randomUUID(),
			deviceName: stored.deviceName ?? null,
		};
		if (!stored.deviceId) writeStoredIdentity(identity);

		set(identity);
		return identity;
	},
	setDeviceName: (name) => {
		const deviceName = normalizeDeviceName(name) || null;
		const stored = readStoredIdentity();
		const identity: DeviceIdentity = {
			deviceId: stored.deviceId ?? crypto.randomUUID(),
			deviceName,
		};
		writeStoredIdentity(identity);
		set(identity);
	},
	setDevices: (devices, discordDeviceId) => {
		set({ devices, discordDeviceId });
	},
	setConnected: (connected) => {
		set(connected ? { connected } : { connected, devices: [] });
	},
	setTransfer: (transfer) => {
		set({ transfer });
	},
}));
