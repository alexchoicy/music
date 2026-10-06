import { onlineManager } from "@tanstack/react-query";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { api } from "@/lib/api";
import { formatExtension } from "@/lib/format";
import {
	getAudioVariant,
	getPlaybackFile,
	isUnplayableExtension,
} from "@/lib/music";
import type { FileObject } from "@/lib/schema";
import {
	isPlayableDownload,
	resolveArtworkUri,
	useOfflineStore,
} from "@/offline/offlineStore";
import type { PlayerTrack } from "@/player/track";
import { getStreamingQuality } from "@/store/settingsStore";

/** The app's single audio player; the player store decides what it plays. */
export const audioPlayer = createAudioPlayer(null, { updateInterval: 500 });

// Lock screen controls need exclusive audio focus; they also keep Android
// playing in the background.
void setAudioModeAsync({
	playsInSilentMode: true,
	shouldPlayInBackground: true,
	interruptionMode: "doNotMix",
});

/** The file being played, for the quality shown on Now Playing. */
export type PlaybackSource = {
	uri: string;
	file: FileObject;
	isLocal: boolean;
	/** Explains a fallback, e.g. Opus playing because the original is DSF. */
	notice: string | null;
};

/** The track cannot play on this device, e.g. an offline DSF original. */
export class UnplayableError extends Error {}

function getDownload(track: PlayerTrack) {
	return useOfflineStore.getState().tracks[track.trackId];
}

/** Whether a track can be picked now: downloaded, or online to stream it. */
export function isAvailable(track: PlayerTrack) {
	return (
		onlineManager.isOnline() || getDownload(track)?.status === "downloaded"
	);
}

/** Whether the track can actually play now, so automatic playback skips it otherwise. */
export function canPlay(track: PlayerTrack) {
	if (isPlayableDownload(getDownload(track))) return true;
	if (!onlineManager.isOnline()) return false;
	const file = getPlaybackFile(track.audio, getStreamingQuality());
	return !isUnplayableExtension(file.extension);
}

/** A downloaded file, otherwise a short-lived URL to stream at the chosen quality. */
export async function resolveSource(
	track: PlayerTrack,
): Promise<PlaybackSource> {
	const download = getDownload(track);
	if (download && isPlayableDownload(download)) {
		const variants = Object.values(track.audio.file).flatMap((file) =>
			file ? [file] : [],
		);
		return {
			uri: download.uri,
			file:
				variants.find((file) => file.id === download.fileObjectId) ??
				track.audio.file.original,
			isLocal: true,
			notice: null,
		};
	}

	if (!onlineManager.isOnline()) {
		throw download?.status === "downloaded"
			? new UnplayableError(
					`The downloaded ${formatExtension(track.audio.file.original)} original can't play on this device. Connect to stream it instead.`,
				)
			: new Error("This track isn't downloaded.");
	}

	const quality = getStreamingQuality();
	const preferred = getAudioVariant(track.audio, quality);
	const file = getPlaybackFile(track.audio, quality);
	if (isUnplayableExtension(file.extension)) {
		throw new UnplayableError(
			`The original ${formatExtension(file)} file can't play on this device.`,
		);
	}

	return {
		uri: await api<string>(`/files/${file.id}`),
		file,
		isLocal: false,
		notice:
			file.id === preferred.id
				? null
				: `The original ${formatExtension(preferred)} file can't play on this device, so Opus 96 is playing.`,
	};
}

export function showOnLockScreen(track: PlayerTrack) {
	audioPlayer.setActiveForLockScreen(
		true,
		{
			title: track.title,
			artist: track.artists.map((artist) => artist.name).join(", "),
			albumTitle: track.albumTitle,
			artworkUrl: resolveArtworkUri(track.cover) ?? undefined,
		},
		// Next and previous come from patched expo-audio; the player store handles them.
		{ showNextTrack: true, showPreviousTrack: true },
	);
}

// A play counts once half the track was heard, capped at four minutes, like
// the web player.
const maxListenThresholdMs = 4 * 60 * 1000;
// Larger jumps between status updates are seeks, not listening.
const maxProgressStepMs = 2000;

let session: {
	track: PlayerTrack;
	listenedMs: number;
	lastPositionMs: number | null;
	recorded: boolean;
} | null = null;

export function startListeningSession(track: PlayerTrack) {
	session = { track, listenedMs: 0, lastPositionMs: null, recorded: false };
}

/** Records the track in listening history once enough of it was heard. */
export function trackListeningProgress(positionSeconds: number) {
	if (!session || session.recorded) return;

	const positionMs = positionSeconds * 1000;
	const step =
		session.lastPositionMs === null ? 0 : positionMs - session.lastPositionMs;
	session.lastPositionMs = positionMs;
	if (step <= 0 || step > maxProgressStepMs) return;

	session.listenedMs += step;
	if (
		session.listenedMs <
		Math.min(session.track.durationInMs / 2, maxListenThresholdMs)
	)
		return;

	session.recorded = true;
	const { albumId, trackId } = session.track;
	api("/history", { method: "POST", body: { albumId, trackId } }).catch(() => {
		// History is best effort; offline plays are not recorded.
	});
}
