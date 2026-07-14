import { toastManager } from "#/components/coss/toast";
import type { MusicWebSocketMessage } from "#/data/webSocket";

let musicSocket: WebSocket | null = null;

const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000;
const RECONNECT_TOAST_ID = "music-websocket-reconnect";

export function connectMusicWebSocket(url: string) {
	let active = true;
	let attempt = 0;
	let retryTimer: number | undefined;
	let socket: WebSocket | null = null;

	const connect = () => {
		if (!active || socket) return;
		retryTimer = undefined;

		socket = new WebSocket(url);
		const currentSocket = socket;
		musicSocket = currentSocket;

		currentSocket.addEventListener("open", () => {
			if (socket !== currentSocket) return;
			attempt = 0;
			toastManager.close(RECONNECT_TOAST_ID);
		});

		currentSocket.addEventListener("close", () => {
			if (socket !== currentSocket) return;
			if (musicSocket === currentSocket) musicSocket = null;
			socket = null;
			if (!active) return;

			const delay = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
			attempt = Math.min(attempt + 1, 9);
			const reconnectNow = () => {
				window.clearTimeout(retryTimer);
				connect();
			};

			toastManager.add({
				id: RECONNECT_TOAST_ID,
				title: "Live connection lost",
				description: `Retrying in ${Math.ceil(delay / 1000)} seconds.`,
				type: "warning",
				timeout: 0,
				actionProps: {
					children: "Reconnect",
					onClick: reconnectNow,
				},
			});

			retryTimer = window.setTimeout(connect, delay);
		});
	};

	connect();

	return () => {
		active = false;
		window.clearTimeout(retryTimer);
		toastManager.close(RECONNECT_TOAST_ID);
		if (musicSocket === socket) musicSocket = null;
		socket?.close();
	};
}

export function sendMusicWebSocketMessage(data: MusicWebSocketMessage["data"]) {
	if (musicSocket?.readyState !== WebSocket.OPEN) return;

	musicSocket.send(JSON.stringify({ type: "music", data }));
}
