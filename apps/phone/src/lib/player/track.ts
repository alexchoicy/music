import type { components } from "@api/schema";

import type { AlbumDetails, AlbumTrack } from "@/lib/album";
import { getAlbumCover } from "@/lib/album";
import { getPreferredAudio } from "@/lib/audio";

type AlbumDisc = AlbumDetails["discs"][number];

/** Everything the player needs about a track, kept so the queue survives restarts. */
export type PlayerTrack = {
	trackId: string;
	albumId: string;
	albumTitle: string;
	title: string;
	contentType: AlbumTrack["contentType"];
	versionType: AlbumTrack["versionType"];
	artists: { partyId: string; name: string }[];
	cover: components["schemas"]["FileObjectDetails"] | null;
	durationInMs: number;
	audio: components["schemas"]["TrackAudioDetails"];
};

export type QueueEntry = PlayerTrack & {
	/** Tells apart repeated tracks in the queue. */
	entryId: string;
};

let nextEntryId = 0;

export function createQueueEntries(tracks: PlayerTrack[]): QueueEntry[] {
	return tracks.map((track) => ({
		...track,
		entryId: `${Date.now()}-${nextEntryId++}`,
	}));
}

export function toPlayerTrack(
	album: AlbumDetails,
	disc: AlbumDisc,
	track: AlbumTrack,
): PlayerTrack | null {
	const audio = getPreferredAudio(track);
	if (!audio) return null;

	const discCover = album.cover.discs.find(
		(cover) => String(cover.albumDiscId) === String(disc.albumDiscId),
	);
	return {
		trackId: String(track.trackId),
		albumId: String(album.albumId),
		albumTitle: album.title,
		title: track.title,
		contentType: track.contentType,
		versionType: track.versionType,
		artists: [
			...new Map(
				track.credits.map((credit) => [
					String(credit.partyId),
					{ partyId: String(credit.partyId), name: credit.name },
				]),
			).values(),
		],
		cover:
			getAlbumCover(discCover?.variants) ?? getAlbumCover(album.cover.album),
		durationInMs: Number(track.durationInMs),
		audio,
	};
}

/** The album's tracks that have audio, in disc and track order. */
export function toPlayerTracks(album: AlbumDetails) {
	return album.discs.flatMap((disc) =>
		disc.tracks.flatMap((track) => toPlayerTrack(album, disc, track) ?? []),
	);
}
