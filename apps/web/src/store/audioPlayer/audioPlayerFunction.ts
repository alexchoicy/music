import type { components } from "#/data/APIschema";
import type { AudioWaveformJson } from "#/data/AudioWaveForm";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { isProbablyPhone } from "#/lib/utils/browser";

import type {
	AudioPlayerState,
	AudioPlayerTrack,
	ResolvedPlaybackQuality,
} from "./audioPlayerType";

type AlbumDetails = components["schemas"]["AlbumDetails"];
type AlbumDiscDetails = components["schemas"]["AlbumDiscDetails"];
type AlbumTrackDetails = components["schemas"]["AlbumTrackDetails"];

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
		party: track.credits.map((credit) => ({
			partyId: String(credit.partyId),
			name: credit.name,
		})),
		albumCoverUrl,
		audio,
		durationInMs: Number(track.durationInMs),
	};
}

export function autoSelectPlaybackQuality(): AudioPlayerState["playbackQuality"] {
	return isProbablyPhone() ? "Opus96" : "Original";
}

export function resolvePlaybackSource(
	playbackQuality: AudioPlayerState["playbackQuality"],
	track: AudioPlayerTrack,
): { key: string; quality: ResolvedPlaybackQuality; url: string } {
	const selectedQuality =
		playbackQuality === "Auto" ? autoSelectPlaybackQuality() : playbackQuality;
	const originalExtension = track.audio.file.original.extension.toLowerCase();
	const needsPlayableFallback = originalExtension === "dsf";

	if (
		(selectedQuality === "Opus96" || needsPlayableFallback) &&
		track.audio.file.opus96
	) {
		const url = `${track.audio.file.opus96.url}/play`;
		return { key: `Opus96:${url}`, quality: "Opus96", url };
	}

	const url = `${track.audio.file.original.url}/play`;
	return { key: `Original:${url}`, quality: "Original", url };
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
		return data.data;
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
