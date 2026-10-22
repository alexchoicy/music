import type * as API from "@music/api";

import type { AudioWaveformJson } from "#/data/AudioWaveForm";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { isProbablyPhone } from "#/lib/utils/browser";

import type {
	AudioPlayerState,
	AudioPlayerTrack,
	ResolvedPlaybackQuality,
} from "./audioPlayerType";

type AlbumDetails = API.AlbumDetails;
type AlbumDiscDetails = API.AlbumDiscDetails;
type AlbumTrackDetails = API.AlbumTrackDetails;

export function albumDetailsToAudioPlayerTracks(
	album: AlbumDetails,
): AudioPlayerTrack[] {
	return album.discs.flatMap((disc) => {
		return disc.tracks
			.filter((track) => track.audios.length > 0)
			.map((track) => albumTrackDetailsToAudioPlayerTrack(album, disc, track));
	});
}

export function albumTrackDetailsToAudioPlayerTrack(
	album: AlbumDetails,
	disc: AlbumDiscDetails,
	track: AlbumTrackDetails,
): AudioPlayerTrack {
	const audio = track.audios.find((item) => item.pinned) ?? track.audios.at(0);
	const discCover = album.cover.discs.find(
		(cover) => String(cover.albumDiscId) === String(disc.albumDiscId),
	);
	const albumCoverUrl =
		getAlbumCoverUrl(discCover?.variants) ??
		getAlbumCoverUrl(album.cover.album) ??
		"";

	if (!audio) {
		throw new Error(`Track ${track.trackId} has no playable audio.`);
	}

	return {
		trackId: String(track.trackId),
		albumId: String(album.albumId),
		albumTitle: album.title,
		contentType: track.contentType,
		versionType: track.versionType,
		title: track.title,
		languageId: track.languageId,
		albumLanguageId: album.languageId,
		party: track.credits.map((credit) => ({
			partyId: String(credit.partyId),
			name: credit.name,
		})),
		albumCoverUrl,
		audio,
		durationInMs: Number(track.durationInMs),
	};
}

export type AlbumTrackEntry =
	| API.PlaylistEntryDetails
	| API.ListeningHistoryEntryDetails
	| API.ListeningHistoryTrackCount;

export function albumTrackEntryToAudioPlayerTrack(
	entry: AlbumTrackEntry,
): AudioPlayerTrack | null {
	const audio = entry.audios.find((item) => item.pinned) ?? entry.audios.at(0);
	if (!audio) return null;

	return {
		trackId: String(entry.trackId),
		albumId: String(entry.albumId),
		albumTitle: entry.albumTitle,
		contentType: entry.contentType,
		versionType: entry.versionType,
		title: entry.title,
		languageId: entry.languageId,
		albumLanguageId: entry.albumLanguageId,
		party: entry.credits.map((credit) => ({
			partyId: String(credit.partyId),
			name: credit.name,
		})),
		albumCoverUrl: getAlbumCoverUrl(entry.cover) ?? "",
		audio,
		durationInMs: Number(entry.durationInMs),
	};
}

export function autoSelectPlaybackQuality(): AudioPlayerState["playbackQuality"] {
	return isProbablyPhone() ? "Opus96" : "Original";
}

export function resolvePlaybackSource(
	playbackQuality: AudioPlayerState["playbackQuality"],
	track: AudioPlayerTrack,
): {
	key: string;
	quality: ResolvedPlaybackQuality;
	url: string;
	fileUrl: string;
} {
	const selectedQuality =
		playbackQuality === "Auto" ? autoSelectPlaybackQuality() : playbackQuality;
	const originalExtension = track.audio.file.original.extension.toLowerCase();
	const needsPlayableFallback = originalExtension === "dsf";

	if (
		(selectedQuality === "Opus96" || needsPlayableFallback) &&
		track.audio.file.opus96
	) {
		const fileUrl = track.audio.file.opus96.url;
		const url = `${fileUrl}/play`;
		return { key: `Opus96:${url}`, quality: "Opus96", url, fileUrl };
	}

	const fileUrl = track.audio.file.original.url;
	const url = `${fileUrl}/play`;
	return { key: `Original:${url}`, quality: "Original", url, fileUrl };
}

// Peaks from loud masters sit near the ceiling, so a linear scale fills the
// whole bar height. Mapping amplitude in dB keeps quiet passages visibly lower.
const WAVEFORM_DYNAMIC_RANGE_DB = 36;

export function shapeWaveformPeaks(data: number[]): number[] {
	let max = 0;
	for (const value of data) max = Math.max(max, Math.abs(value));
	if (max === 0) return data;

	return data.map((value) => {
		const linear = Math.abs(value) / max;
		const db = 20 * Math.log10(linear || Number.EPSILON);
		const shaped = Math.max(0, 1 + db / WAVEFORM_DYNAMIC_RANGE_DB);
		return Math.sign(value) * shaped;
	});
}

export async function getWaveformData(url: string): Promise<number[] | null> {
	try {
		const response = await fetch(url, {
			method: "GET",
		});

		if (!response.ok) {
			return null;
		}

		const data: AudioWaveformJson = await response.json();
		return shapeWaveformPeaks(data.data);
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		console.log("Error fetching waveform data:", error);
		return null;
	}
}

export async function getPresignedUrl(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			method: "GET",
			credentials: "include",
		});

		if (!response.ok) {
			return null;
		}

		return await response.text();
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		console.log("Error fetching presigned URL:", error);
		return null;
	}
}

export async function getPresignedDownloadUrl(
	url: string,
): Promise<string | null> {
	try {
		const response = await fetch(`${url}/download`, {
			method: "GET",
			credentials: "include",
		});

		if (!response.ok) {
			return null;
		}

		return await response.text();
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		console.log("Error fetching presigned download URL:", error);
		return null;
	}
}
