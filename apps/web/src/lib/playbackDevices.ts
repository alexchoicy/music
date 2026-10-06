import { toastManager } from "#/components/coss/toast";
import { transferSnapshotSchema } from "#/data/webSocket";
import type {
	DeviceControlAction,
	PlaybackDeviceSession,
	PlaybackState,
	WebSocketServerMessage,
} from "#/data/webSocket";
import { connectMusicWebSocket, sendWebSocketMessage } from "#/lib/webSocket";
import {
	getPlaybackPositionMs,
	onPlaybackSeek,
	useAudioPlayerStore,
} from "#/store/audioPlayer/audioPlayerStore";
import {
	getDefaultDeviceName,
	getSessionId,
	PLAYBACK_DEVICE_STORAGE_KEY,
	usePlaybackDeviceStore,
} from "#/store/playbackDeviceStore";

const STATE_REPORT_DELAY_MS = 150;
const TRANSFER_TIMEOUT_MS = 30_000;

let transferTimer: number | undefined;
// Requests this tab answered as the source, keyed to the destination's name.
const outgoingTransfers = new Map<string, string>();

// Reads the identity from storage each time so every tab registers the same device.
function register() {
	const { deviceId, deviceName } = usePlaybackDeviceStore
		.getState()
		.loadIdentity();
	sendWebSocketMessage({
		type: "register",
		data: {
			deviceId,
			sessionId: getSessionId(),
			name: deviceName ?? getDefaultDeviceName(),
		},
	});
}

function getPlaybackState(): PlaybackState {
	const { index, queue, status } = useAudioPlayerStore.getState();
	const track = queue.at(index);

	return {
		status: track ? status : "idle",
		positionMs: getPlaybackPositionMs(),
		track: track
			? {
					trackId: track.trackId,
					albumId: track.albumId,
					title: track.title,
					albumTitle: track.albumTitle,
					artists: track.party.map((party) => party.name),
					coverUrl: track.albumCoverUrl || null,
					durationMs: Math.max(0, Math.round(track.durationInMs)),
				}
			: null,
	};
}

function reportPlaybackState() {
	sendWebSocketMessage({ type: "state", data: getPlaybackState() });
}

function handleControl(action: DeviceControlAction) {
	const player = useAudioPlayerStore.getState();
	if (action === "pause") {
		player.pause();
		return;
	}

	if (player.status !== "playing" && player.status !== "loading") {
		void player.togglePlay();
	}
}

function finishTransfer(requestId: string) {
	const { transfer, setTransfer } = usePlaybackDeviceStore.getState();
	if (transfer?.requestId !== requestId) return;

	window.clearTimeout(transferTimer);
	setTransfer(null);
}

function failTransfer(requestId: string, reason: string) {
	if (usePlaybackDeviceStore.getState().transfer?.requestId !== requestId)
		return;

	finishTransfer(requestId);
	toastManager.add({
		title: "Could not move playback",
		description: reason,
		type: "error",
	});
}

async function adoptTransfer(requestId: string, snapshot: unknown) {
	const transfer = usePlaybackDeviceStore.getState().transfer;
	if (transfer?.requestId !== requestId || transfer.preparing) return;

	const result = transferSnapshotSchema.safeParse(snapshot);
	const valid = result.success && result.data.index < result.data.queue.length;
	if (!valid) {
		sendWebSocketMessage({
			type: "transferResult",
			data: { requestId, success: false },
		});
		failTransfer(requestId, "The other device sent an unreadable queue.");
		return;
	}

	window.clearTimeout(transferTimer);
	usePlaybackDeviceStore.getState().setTransfer({
		...transfer,
		preparing: true,
	});

	const success = await useAudioPlayerStore
		.getState()
		.adoptTransfer(result.data);
	// The source only stops after this confirmation; without it, it keeps playing.
	sendWebSocketMessage({
		type: "transferResult",
		data: { requestId, success },
	});

	if (success) {
		finishTransfer(requestId);
		return;
	}
	failTransfer(
		requestId,
		"This device could not start playback. The other device was left unchanged.",
	);
}

function handleMessage(message: WebSocketServerMessage) {
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
			const snapshot = useAudioPlayerStore.getState().getTransferSnapshot();
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
			void adoptTransfer(message.data.requestId, message.data.snapshot);
			break;
		case "transferRelease": {
			const deviceName = outgoingTransfers.get(message.data.requestId);
			if (deviceName === undefined) break;

			outgoingTransfers.delete(message.data.requestId);
			useAudioPlayerStore.getState().stopForTransfer();
			toastManager.add({
				title: "Playback moved",
				description: `Now playing on ${deviceName}.`,
			});
			break;
		}
		case "transferFailed":
			// Once preparing, this tab already holds the snapshot and reports its own outcome.
			if (usePlaybackDeviceStore.getState().transfer?.preparing) break;
			failTransfer(message.data.requestId, message.data.reason);
			break;
	}
}

// Connects this tab as a player session and keeps the server informed of its playback.
export function connectPlaybackDevice(url: string) {
	let reportTimer: number | undefined;
	const scheduleReport = () => {
		window.clearTimeout(reportTimer);
		reportTimer = window.setTimeout(reportPlaybackState, STATE_REPORT_DELAY_MS);
	};

	const disconnect = connectMusicWebSocket(url, {
		onOpen: () => {
			usePlaybackDeviceStore.getState().setConnected(true);
			register();
			reportPlaybackState();
		},
		onClose: () => {
			usePlaybackDeviceStore.getState().setConnected(false);
			const transfer = usePlaybackDeviceStore.getState().transfer;
			if (transfer && !transfer.preparing) {
				failTransfer(transfer.requestId, "The live connection was lost.");
			}
			outgoingTransfers.clear();
		},
		onMessage: handleMessage,
	});

	const unsubscribePlayer = useAudioPlayerStore.subscribe((state, previous) => {
		if (
			state.status !== previous.status ||
			state.queue.at(state.index)?.trackId !==
				previous.queue.at(previous.index)?.trackId
		) {
			scheduleReport();
		}
	});
	const unsubscribeSeek = onPlaybackSeek(scheduleReport);

	// Another tab created or renamed this device.
	const handleStorage = (event: StorageEvent) => {
		if (event.key === PLAYBACK_DEVICE_STORAGE_KEY) register();
	};
	window.addEventListener("storage", handleStorage);

	return () => {
		window.clearTimeout(reportTimer);
		window.removeEventListener("storage", handleStorage);
		unsubscribePlayer();
		unsubscribeSeek();
		disconnect();
	};
}

export function renamePlaybackDevice(name: string) {
	usePlaybackDeviceStore.getState().setDeviceName(name);
	register();
}

export function controlPlaybackDevice(
	deviceId: string,
	sessionId: string,
	action: DeviceControlAction,
) {
	sendWebSocketMessage({
		type: "control",
		data: { deviceId, sessionId, action },
	});
}

export function selectDiscordDevice(deviceId: string | null) {
	sendWebSocketMessage({ type: "discordDevice", data: { deviceId } });
}

export function movePlaybackHere(deviceId: string, sessionId: string) {
	const store = usePlaybackDeviceStore.getState();
	if (store.transfer) return;

	const requestId = crypto.randomUUID();
	const sent = sendWebSocketMessage({
		type: "transfer",
		data: { requestId, deviceId, sessionId },
	});
	if (!sent) {
		toastManager.add({
			title: "Could not move playback",
			description: "The live connection is not available.",
			type: "error",
		});
		return;
	}

	store.setTransfer({ requestId, deviceId, sessionId, preparing: false });
	window.clearTimeout(transferTimer);
	transferTimer = window.setTimeout(() => {
		sendWebSocketMessage({
			type: "transferResult",
			data: { requestId, success: false },
		});
		failTransfer(requestId, "The other device did not respond.");
	}, TRANSFER_TIMEOUT_MS);
}

// The session that represents a device: the latest to start playing, then the latest with a track.
export function getActiveSession(
	sessions: PlaybackDeviceSession[],
): PlaybackDeviceSession | undefined {
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
