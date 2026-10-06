import { toastManager } from "#/components/coss/toast";
import { webSocketServerMessageSchema } from "#/data/webSocket";
import type {
	WebSocketClientMessage,
	WebSocketServerMessage,
} from "#/data/webSocket";

let musicSocket: WebSocket | null = null;

const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000;
const RECONNECT_TOAST_ID = "music-websocket-reconnect";

type MusicWebSocketHandlers = {
	onOpen: () => void;
	onClose: () => void;
	onMessage: (message: WebSocketServerMessage) => void;
};

export function connectMusicWebSocket(
	url: string,
	handlers: MusicWebSocketHandlers,
) {
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
			handlers.onOpen();
		});

		currentSocket.addEventListener("message", (event) => {
			if (socket !== currentSocket || typeof event.data !== "string") return;

			let json: unknown;
			try {
				json = JSON.parse(event.data);
			} catch {
				return;
			}

			const result = webSocketServerMessageSchema.safeParse(json);
			if (!result.success) {
				console.log("[websocket] unknown message", result.error);
				return;
			}

			handlers.onMessage(result.data);
		});

		currentSocket.addEventListener("close", () => {
			if (socket !== currentSocket) return;
			if (musicSocket === currentSocket) musicSocket = null;
			socket = null;
			handlers.onClose();
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

export function sendWebSocketMessage(message: WebSocketClientMessage): boolean {
	if (musicSocket?.readyState !== WebSocket.OPEN) return false;

	musicSocket.send(JSON.stringify(message));
	return true;
}
