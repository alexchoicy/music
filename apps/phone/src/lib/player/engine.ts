import type { components } from "@api/schema";
import { onlineManager } from "@tanstack/react-query";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { apiFetch } from "@/lib/api";
import {
	getAudioVariant,
	getPlaybackFile,
	isUnplayableExtension,
} from "@/lib/audio";
import { isOnWifi } from "@/lib/network";
import { isPlayableDownload, resolveArtworkUri } from "@/lib/offline/media";
import type { PlayerTrack } from "@/lib/player/track";
import { useOfflineStore } from "@/store/offlineStore";
import type { AudioQuality } from "@/store/settingsStore";
import { useSettingsStore } from "@/store/settingsStore";

type FileObjectDetails = components["schemas"]["FileObjectDetails"];

/** The app's single audio player; the player store decides what it plays. */
export const audioPlayer = createAudioPlayer(null, { updateInterval: 500 });

// Lock screen controls need exclusive audio focus; they also keep Android
// playing in the background.
void setAudioModeAsync({
	playsInSilentMode: true,
	shouldPlayInBackground: true,
	interruptionMode: "doNotMix",
});

/** The file the player is using, for the format shown on Now Playing. */
export type PlaybackSource = {
	uri: string;
	file: FileObjectDetails;
	isLocal: boolean;
	/** Explains a fallback, e.g. Opus playing because the original is DSF. */
	notice: string | null;
};

/** The track cannot play on this device, e.g. an offline DSF original. */
export class UnplayableError extends Error {}

function getDownload(track: PlayerTrack) {
	return useOfflineStore.getState().tracks[track.trackId];
}

function formatExtension(file: FileObjectDetails) {
	return file.extension.replace(/^\./, "").toUpperCase();
}

/** The quality to stream at: originals on Wi‑Fi when saving played tracks. */
export function getStreamingQuality(
	settings = useSettingsStore.getState(),
): AudioQuality {
	return settings.savePlayedTracks && isOnWifi()
		? "original"
		: settings.streamingQuality;
}

/** Whether played tracks are saved for offline, on any network. */
export function shouldSavePlayedTracks() {
	return useSettingsStore.getState().savePlayedTracks;
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
	const variants = Object.values(track.audio.file).filter(
		(file): file is FileObjectDetails => !!file,
	);
	if (download && isPlayableDownload(download)) {
		return {
			uri: download.uri,
			file:
				variants.find((file) => file.id === download.fileObjectId) ??
				track.audio.file.original,
			isLocal: true,
			notice: null,
		};
	}

	const quality = getStreamingQuality();
	const preferred = getAudioVariant(track.audio, quality);
	const file = getPlaybackFile(track.audio, quality);
	if (!onlineManager.isOnline()) {
		throw download?.status === "downloaded"
			? new UnplayableError(
					`The downloaded ${formatExtension(track.audio.file.original)} original can't be played on this device. Connect to stream it instead.`,
				)
			: new Error("This track isn't downloaded.");
	}
	if (isUnplayableExtension(file.extension)) {
		throw new UnplayableError(
			`The original ${formatExtension(file)} file can't be played on this device.`,
		);
	}

	const result = await apiFetch<string>(`/files/${file.id}`, {
		headers: { Accept: "application/json" },
	});
	if (!result.ok) throw new Error(`Server responded with ${result.status}`);
	return {
		uri: result.data,
		file,
		isLocal: false,
		notice:
			file.id === preferred.id
				? null
				: `The original ${formatExtension(preferred)} file can't be played on this device, so Opus 96 is playing.`,
	};
}

export function showOnLockScreen(track: PlayerTrack) {
	const metadata = {
		title: track.title,
		artist: track.artists.map((artist) => artist.name).join(", "),
		albumTitle: track.albumTitle,
		artworkUrl:
			resolveArtworkUri(track.cover, useOfflineStore.getState().artwork) ??
			undefined,
	};
	// Next and previous are handled by the player store (patched expo-audio).
	audioPlayer.setActiveForLockScreen(true, metadata, {
		showNextTrack: true,
		showPreviousTrack: true,
	});
}

// A play counts once half the track was heard, capped at four minutes; this
// matches the web player.
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
	apiFetch("/history", {
		method: "POST",
		body: JSON.stringify({ albumId, trackId }),
	}).catch(() => {
		// History is best effort; offline plays are not recorded.
	});
}
