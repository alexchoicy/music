import { onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import { z } from "zod";

import { useSessionStore } from "@/store/sessionStore";

// The live connection shares playback between the user's devices, like the web player.

const playbackTrackSchema = z.strictObject({
	trackId: z.string(),
	albumId: z.string(),
	title: z.string(),
	albumTitle: z.string(),
	artists: z.array(z.string()),
	coverUrl: z.string().nullable().optional(),
	durationMs: z.number().int().min(0),
});

const playbackStateSchema = z.strictObject({
	status: z.enum(["idle", "loading", "ready", "playing", "paused"]),
	positionMs: z.number().int().min(0),
	track: playbackTrackSchema.nullable().optional(),
});

const deviceControlActionSchema = z.enum(["play", "pause"]);

const deviceSessionSchema = z.strictObject({
	sessionId: z.string(),
	state: playbackStateSchema.nullable().optional(),
	stateUpdatedAt: z.number(),
	activatedAt: z.number(),
	connectedAt: z.number(),
});

const deviceSchema = z.strictObject({
	deviceId: z.string(),
	name: z.string(),
	sessions: z.array(deviceSessionSchema),
});

/**
 * The queue moved between devices. The server relays it without reading it, so
 * it uses the web player's track shape; tracks keep any extra fields.
 */
export const transferSnapshotSchema = z.object({
	queue: z
		.array(
			z.looseObject({
				trackId: z.string(),
				albumId: z.string(),
				title: z.string(),
				durationInMs: z.number(),
				audio: z.looseObject({
					file: z.looseObject({
						original: z.looseObject({
							url: z.string(),
							extension: z.string(),
						}),
					}),
				}),
			}),
		)
		.min(1),
	index: z.number().int().min(0),
	positionMs: z.number().min(0),
	playing: z.boolean(),
});

const serverMessageSchema = z.discriminatedUnion("type", [
	z.strictObject({
		type: z.literal("devices"),
		data: z.strictObject({
			devices: z.array(deviceSchema),
			discordDeviceId: z.string().nullable().optional(),
		}),
	}),
	z.strictObject({
		type: z.literal("control"),
		data: z.strictObject({ action: deviceControlActionSchema }),
	}),
	z.strictObject({
		type: z.literal("transferSnapshotRequest"),
		data: z.strictObject({ requestId: z.string(), deviceName: z.string() }),
	}),
	z.strictObject({
		type: z.literal("transferSnapshot"),
		data: z.strictObject({ requestId: z.string(), snapshot: z.unknown() }),
	}),
	z.strictObject({
		type: z.literal("transferRelease"),
		data: z.strictObject({ requestId: z.string() }),
	}),
	z.strictObject({
		type: z.literal("transferFailed"),
		data: z.strictObject({ requestId: z.string(), reason: z.string() }),
	}),
]);

export type PlaybackState = z.infer<typeof playbackStateSchema>;
export type DeviceControlAction = z.infer<typeof deviceControlActionSchema>;
export type PlaybackDevice = z.infer<typeof deviceSchema>;
export type PlaybackDeviceSession = z.infer<typeof deviceSessionSchema>;
export type TransferSnapshot = z.infer<typeof transferSnapshotSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export type ClientMessage =
	| {
			type: "register";
			data: { deviceId: string; sessionId: string; name: string };
	  }
	| { type: "state"; data: PlaybackState }
	| {
			type: "control";
			data: {
				deviceId: string;
				sessionId: string;
				action: DeviceControlAction;
			};
	  }
	| { type: "discordDevice"; data: { deviceId: string | null } }
	| {
			type: "transfer";
			data: { requestId: string; deviceId: string; sessionId: string };
	  }
	| {
			type: "transferSnapshot";
			data: { requestId: string; snapshot: TransferSnapshot | null };
	  }
	| {
			type: "transferResult";
			data: { requestId: string; success: boolean };
	  };

type WebSocketHandlers = {
	onOpen: () => void;
	onClose: () => void;
	onMessage: (message: ServerMessage) => void;
};

const maxReconnectDelayMs = 5 * 60 * 1000;

// React Native's WebSocket takes headers as a third argument, which the DOM
// types used for it do not declare.
const NativeWebSocket = WebSocket as unknown as new (
	url: string,
	protocols: undefined,
	options: { headers: Record<string, string> },
) => WebSocket;

let socket: WebSocket | null = null;

/** The socket URL for a server, e.g. `https://music.example.com/api` → `wss://music.example.com/api/ws`. */
function toWebSocketUrl(serverUrl: string) {
	return `${serverUrl.replace(/^http/i, "ws")}/ws`;
}

function parseMessage(data: unknown) {
	if (typeof data !== "string") return null;
	try {
		const result = serverMessageSchema.safeParse(JSON.parse(data));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

/** Keeps a live connection while signed in, reconnecting with backoff. Returns a disconnect function. */
export function connectWebSocket(handlers: WebSocketHandlers) {
	let active = true;
	let attempt = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;

	const connect = () => {
		clearTimeout(retryTimer);
		const { serverUrl, token } = useSessionStore.getState();
		if (!active || socket || !serverUrl || !token) return;

		// The socket signs in with the token, like other requests.
		const current = new NativeWebSocket(toWebSocketUrl(serverUrl), undefined, {
			headers: { Authorization: `Bearer ${token}` },
		});
		socket = current;
		current.onopen = () => {
			if (socket !== current) return;
			attempt = 0;
			handlers.onOpen();
		};
		current.onmessage = (event) => {
			if (socket !== current) return;
			const message = parseMessage(event.data);
			if (message) handlers.onMessage(message);
		};
		current.onclose = () => {
			if (socket !== current) return;
			socket = null;
			handlers.onClose();
			if (!active) return;
			const delay = Math.min(1000 * 2 ** attempt, maxReconnectDelayMs);
			attempt = Math.min(attempt + 1, 9);
			retryTimer = setTimeout(connect, delay);
		};
	};

	// Reconnects right away when the phone comes back online or to the foreground.
	const unsubscribeOnline = onlineManager.subscribe((isOnline) => {
		if (isOnline) connect();
	});
	const appState = AppState.addEventListener("change", (state) => {
		if (state === "active") connect();
	});

	connect();

	return () => {
		active = false;
		clearTimeout(retryTimer);
		unsubscribeOnline();
		appState.remove();
		const current = socket;
		socket = null;
		current?.close();
		if (current) handlers.onClose();
	};
}

/** Sends a message if connected; returns whether it was sent. */
export function sendWebSocketMessage(message: ClientMessage) {
	if (socket?.readyState !== WebSocket.OPEN) return false;
	socket.send(JSON.stringify(message));
	return true;
}
