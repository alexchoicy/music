import { historyActions } from "#/lib/queries/history.queries";

import type { AudioPlayerTrack } from "./audioPlayerType";

// A play counts once the listener has heard half the track, capped at four minutes.
const MAX_LISTEN_THRESHOLD_MS = 4 * 60 * 1000;
// Larger jumps between time updates are seeks, not listening.
const MAX_PROGRESS_STEP_MS = 2000;

type ListeningSession = {
	track: AudioPlayerTrack;
	listenedMs: number;
	lastPositionMs: number | null;
	recorded: boolean;
};

let session: ListeningSession | null = null;
const recordedListeners = new Set<() => void>();

export function startListeningSession(track: AudioPlayerTrack): void {
	session = { track, listenedMs: 0, lastPositionMs: null, recorded: false };
}

export function trackListeningProgress(positionSeconds: number): void {
	if (!session || session.recorded) return;

	const positionMs = positionSeconds * 1000;
	const step =
		session.lastPositionMs === null ? 0 : positionMs - session.lastPositionMs;
	session.lastPositionMs = positionMs;
	if (step <= 0 || step > MAX_PROGRESS_STEP_MS) return;

	session.listenedMs += step;
	if (
		session.listenedMs <
		Math.min(session.track.durationInMs / 2, MAX_LISTEN_THRESHOLD_MS)
	)
		return;

	session.recorded = true;
	const { albumId, trackId } = session.track;
	historyActions
		.record({ albumId, trackId })
		.then(() => {
			for (const listener of recordedListeners) listener();
		})
		.catch((error) => {
			console.log("[audio-player] listening history record failed", error);
		});
}

export function onListeningHistoryRecorded(listener: () => void) {
	recordedListeners.add(listener);
	return () => {
		recordedListeners.delete(listener);
	};
}
