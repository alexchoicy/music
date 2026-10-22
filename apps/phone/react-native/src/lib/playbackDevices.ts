import { AppState } from "react-native";

import type {
	DeviceControlAction,
	PlaybackDeviceSession,
	PlaybackState,
	ServerMessage,
} from "@/lib/webSocket";
import {
	connectWebSocket,
	sendWebSocketMessage,
	transferSnapshotSchema,
} from "@/lib/webSocket";
import { audioPlayer } from "@/player/engine";
import {
	adoptTransfer,
	getTransferSnapshot,
	onPlayerSeek,
	stopForTransfer,
	usePlayerStore,
} from "@/player/playerStore";
import {
	createId,
	getDefaultDeviceName,
	usePlaybackDeviceStore,
} from "@/store/playbackDeviceStore";
import { showToast } from "@/store/toastStore";

const transferTimeoutMs = 30_000;

// A new session per connection: after a network change the server may still
// hold the previous one, and it ignores a session ID it already has.
let sessionId = createId();
let transferTimer: ReturnType<typeof setTimeout> | undefined;
// Requests this phone answered as the source, keyed to the destination's name.
const outgoingTransfers = new Map<string, string>();

function register() {
	const { deviceId, deviceName } = usePlaybackDeviceStore.getState();
	sendWebSocketMessage({
		type: "register",
		data: { deviceId, sessionId, name: deviceName ?? getDefaultDeviceName() },
	});
}

function getPlaybackState(): PlaybackState {
	const { queue, index, status } = usePlayerStore.getState();
	const entry = queue.at(index);
	return {
		status: entry ? status : "idle",
		positionMs: Math.max(0, Math.round(audioPlayer.currentTime * 1000)),
		track: entry
			? {
					trackId: entry.trackId,
					albumId: entry.albumId,
					title: entry.title,
					albumTitle: entry.albumTitle,
					artists: entry.artists.map((artist) => artist.name),
					coverUrl: entry.cover?.url ?? null,
					durationMs: Math.max(0, Math.round(entry.durationInMs)),
				}
			: null,
	};
}

function reportPlaybackState() {
	sendWebSocketMessage({ type: "state", data: getPlaybackState() });
}

function handleControl(action: DeviceControlAction) {
	const { status, togglePlayback } = usePlayerStore.getState();
	// Toggling while loading does nothing, so a loading track is left to start.
	if ((action === "pause") === (status === "playing")) togglePlayback();
}

function finishTransfer(requestId: string) {
	const { transfer, setTransfer } = usePlaybackDeviceStore.getState();
	if (transfer?.requestId !== requestId) return;
	clearTimeout(transferTimer);
	setTransfer(null);
}

function failTransfer(requestId: string, reason: string) {
	if (usePlaybackDeviceStore.getState().transfer?.requestId !== requestId)
		return;
	finishTransfer(requestId);
	showToast(`Couldn't move playback. ${reason}`);
}

async function receiveTransfer(requestId: string, snapshot: unknown) {
	const transfer = usePlaybackDeviceStore.getState().transfer;
	if (transfer?.requestId !== requestId || transfer.preparing) return;

	const result = transferSnapshotSchema.safeParse(snapshot);
	if (!result.success || result.data.index >= result.data.queue.length) {
		sendWebSocketMessage({
			type: "transferResult",
			data: { requestId, success: false },
		});
		failTransfer(requestId, "The other device sent an unreadable queue.");
		return;
	}

	clearTimeout(transferTimer);
	usePlaybackDeviceStore
		.getState()
		.setTransfer({ ...transfer, preparing: true });

	const success = await adoptTransfer(result.data);
	// The other device only stops after this confirmation.
	sendWebSocketMessage({
		type: "transferResult",
		data: { requestId, success },
	});
	if (success) finishTransfer(requestId);
	else {
		failTransfer(
			requestId,
			"This phone couldn't start playback. The other device kept playing.",
		);
	}
}

function handleMessage(message: ServerMessage) {
	switch (message.type) {
		case "devices":
			usePlaybackDeviceStore
				.getState()
				.setDevices(message.data.devices, message.data.discordDeviceId ?? null);
			break;
		case "control":
			handleControl(message.data.action);
			break;
		case "transferSnapshotRequest": {
			const snapshot = getTransferSnapshot();
			if (snapshot) {
				outgoingTransfers.set(message.data.requestId, message.data.deviceName);
			}
			sendWebSocketMessage({
				type: "transferSnapshot",
				data: { requestId: message.data.requestId, snapshot },
			});
			break;
		}
		case "transferSnapshot":
			void receiveTransfer(message.data.requestId, message.data.snapshot);
			break;
		case "transferRelease": {
			const deviceName = outgoingTransfers.get(message.data.requestId);
			if (deviceName === undefined) break;
			outgoingTransfers.delete(message.data.requestId);
			stopForTransfer();
			showToast(`Now playing on ${deviceName}.`);
			break;
		}
		case "transferFailed":
			// Once preparing, this phone holds the queue and reports its own outcome.
			if (usePlaybackDeviceStore.getState().transfer?.preparing) break;
			failTransfer(message.data.requestId, message.data.reason);
			break;
	}
}

/** Connects this phone as a player and keeps the user's other devices informed of its playback. */
export function connectPlaybackDevice() {
	let active = true;
	let reportQueued = false;
	// Batches the store updates of one change into one report. Android pauses
	// JS timers in the background, so a timer would hold reports until the app opens.
	const scheduleReport = () => {
		if (reportQueued) return;
		reportQueued = true;
		queueMicrotask(() => {
			reportQueued = false;
			if (active) reportPlaybackState();
		});
	};

	const connection = connectWebSocket({
		// Paused in the background, the phone needs no live updates, and closing
		// the connection lets Android idle the app.
		isWanted: () => {
			const { status } = usePlayerStore.getState();
			return (
				AppState.currentState === "active" ||
				status === "playing" ||
				status === "loading"
			);
		},
		onOpen: () => {
			sessionId = createId();
			usePlaybackDeviceStore.getState().setConnected(true);
			register();
			reportPlaybackState();
		},
		onClose: () => {
			usePlaybackDeviceStore.getState().setConnected(false);
			const { transfer } = usePlaybackDeviceStore.getState();
			if (transfer && !transfer.preparing) {
				failTransfer(transfer.requestId, "The live connection was lost.");
			}
			outgoingTransfers.clear();
		},
		onMessage: handleMessage,
	});

	const appState = AppState.addEventListener("change", connection.update);
	const unsubscribePlayer = usePlayerStore.subscribe((state, prev) => {
		if (state.status !== prev.status) connection.update();
		if (
			state.status !== prev.status ||
			state.queue.at(state.index)?.trackId !==
				prev.queue.at(prev.index)?.trackId
		) {
			scheduleReport();
		}
	});
	const unsubscribeSeek = onPlayerSeek(scheduleReport);

	return () => {
		active = false;
		appState.remove();
		unsubscribePlayer();
		unsubscribeSeek();
		connection.disconnect();
	};
}

export function renamePlaybackDevice(name: string) {
	usePlaybackDeviceStore.getState().setDeviceName(name);
	register();
}

export function controlPlaybackDevice(
	deviceId: string,
	targetSessionId: string,
	action: DeviceControlAction,
) {
	sendWebSocketMessage({
		type: "control",
		data: { deviceId, sessionId: targetSessionId, action },
	});
}

export function selectDiscordDevice(deviceId: string | null) {
	sendWebSocketMessage({ type: "discordDevice", data: { deviceId } });
}

/** Asks another device for its queue; it keeps playing until this phone is ready. */
export function movePlaybackHere(deviceId: string, sourceSessionId: string) {
	const store = usePlaybackDeviceStore.getState();
	if (store.transfer) return;

	const requestId = createId();
	const sent = sendWebSocketMessage({
		type: "transfer",
		data: { requestId, deviceId, sessionId: sourceSessionId },
	});
	if (!sent) {
		showToast("Couldn't move playback. The live connection isn't available.");
		return;
	}

	store.setTransfer({
		requestId,
		deviceId,
		sessionId: sourceSessionId,
		preparing: false,
	});
	clearTimeout(transferTimer);
	transferTimer = setTimeout(() => {
		sendWebSocketMessage({
			type: "transferResult",
			data: { requestId, success: false },
		});
		failTransfer(requestId, "The other device didn't respond.");
	}, transferTimeoutMs);
}

/** The session that represents a device: the latest to start playing, then the latest with a track. */
export function getActiveSession(sessions: PlaybackDeviceSession[]) {
	const latest = (
		candidates: PlaybackDeviceSession[],
		key: (session: PlaybackDeviceSession) => number,
	) =>
		candidates.reduce<PlaybackDeviceSession | undefined>(
			(best, session) => (!best || key(session) > key(best) ? session : best),
			undefined,
		);

	return (
		latest(
			sessions.filter((session) => session.state?.status === "playing"),
			(session) => session.activatedAt,
		) ??
		latest(
			sessions.filter((session) => session.state?.track),
			(session) => session.stateUpdatedAt,
		) ??
		latest(sessions, (session) => session.connectedAt)
	);
}
