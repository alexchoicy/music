import { onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";

import { useSessionStore } from "@/store/sessionStore";

/** A playback event; the server shows the latest one as Discord presence. */
export type PlaybackMessage = {
	action: "play" | "pause" | "change" | "changeTime" | "end";
	positionMs: number;
	trackID?: string;
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

/** Keeps a live connection while signed in, reconnecting with backoff. Returns a disconnect function. */
export function connectWebSocket() {
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
			attempt = 0;
		};
		current.onclose = () => {
			if (socket !== current) return;
			socket = null;
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
	};
}

export function sendPlaybackMessage(data: PlaybackMessage) {
	if (socket?.readyState !== WebSocket.OPEN) return;
	socket.send(JSON.stringify({ type: "music", data }));
}
