import type { components } from "@api/schema";

import type { AlbumTrack } from "@/lib/album";
import type { AudioQuality } from "@/store/settingsStore";

type TrackAudio = components["schemas"]["TrackAudioDetails"];

/** The pinned, then best-ranked, source of a track. */
export function getPreferredAudio(track: Pick<AlbumTrack, "audios">) {
	return [...track.audios]
		.sort(
			(a, b) =>
				Number(b.pinned) - Number(a.pinned) || Number(a.rank) - Number(b.rank),
		)
		.at(0);
}

/** The file of a source for a quality; Opus falls back to the original. */
export function getAudioVariant(audio: TrackAudio, quality: AudioQuality) {
	return quality === "efficient"
		? (audio.file.opus96 ?? audio.file.original)
		: audio.file.original;
}

/** The file to play or download for a quality. */
export function getAudioFile(track: AlbumTrack, quality: AudioQuality) {
	const audio = getPreferredAudio(track);
	return audio ? getAudioVariant(audio, quality) : null;
}

/** Formats the phone cannot decode, e.g. DSD. */
export function isUnplayableExtension(extension: string) {
	return /^\.?dsf$/i.test(extension);
}

/** The file to stream; unplayable originals fall back to Opus. */
export function getPlaybackFile(audio: TrackAudio, quality: AudioQuality) {
	const file = getAudioVariant(audio, quality);
	return isUnplayableExtension(file.extension) && audio.file.opus96
		? audio.file.opus96
		: file;
}
