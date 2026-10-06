import { getDiscCover, getPreferredAudio } from "@/lib/music";
import type {
	AlbumDetails,
	AlbumDisc,
	AlbumTrack,
	FileObject,
	TrackAudio,
} from "@/lib/schema";

/** Everything the player needs about a track; saved so the queue survives restarts. */
export type PlayerTrack = {
	trackId: string;
	albumId: string;
	albumDiscId: string;
	albumTitle: string;
	title: string;
	contentType: AlbumTrack["contentType"];
	versionType: AlbumTrack["versionType"];
	artists: { partyId: string; name: string }[];
	cover: FileObject | null;
	durationInMs: number;
	audio: TrackAudio;
};

export type QueueEntry = PlayerTrack & {
	/** Tells repeated tracks in the queue apart. */
	entryId: string;
};

let nextEntryId = 0;

export function createQueueEntries(tracks: PlayerTrack[]): QueueEntry[] {
	return tracks.map((track) => ({
		...track,
		entryId: `${Date.now()}-${nextEntryId++}`,
	}));
}

/** The track as the player plays it; null when it has no audio. */
export function toPlayerTrack(
	album: AlbumDetails,
	disc: AlbumDisc,
	track: AlbumTrack,
): PlayerTrack | null {
	const audio = getPreferredAudio(track);
	if (!audio) return null;

	return {
		trackId: String(track.trackId),
		albumId: String(album.albumId),
		albumDiscId: String(disc.albumDiscId),
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
		cover: getDiscCover(album, disc.albumDiscId),
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

/** A track of an album by disc and track id, e.g. a playlist entry or radio pick. */
export function findPlayerTrack(
	album: AlbumDetails,
	albumDiscId: number | string,
	trackId: number | string,
) {
	const disc = album.discs.find(
		(item) => String(item.albumDiscId) === String(albumDiscId),
	);
	const track = disc?.tracks.find(
		(item) => String(item.trackId) === String(trackId),
	);
	return disc && track ? toPlayerTrack(album, disc, track) : null;
}

/**
 * A track as moved to another device, in the web player's shape. The phone's
 * own fields stay alongside, and the web player keeps them.
 */
export function toTransferTrack({ entryId: _, ...track }: QueueEntry) {
	return {
		...track,
		party: track.artists,
		albumCoverUrl: track.cover?.url ?? "",
	};
}

/** A track moved from another device, rebuilt from its album; null when it has no audio here. */
export function fromTransferTrack(
	album: AlbumDetails,
	track: { trackId: string; albumDiscId?: unknown },
) {
	const discId =
		typeof track.albumDiscId === "string" ? track.albumDiscId : undefined;
	// Web players do not send the disc, so it is found by track.
	const disc =
		album.discs.find((item) => String(item.albumDiscId) === discId) ??
		album.discs.find((item) =>
			item.tracks.some(
				(albumTrack) => String(albumTrack.trackId) === track.trackId,
			),
		);
	const albumTrack = disc?.tracks.find(
		(item) => String(item.trackId) === track.trackId,
	);
	return disc && albumTrack ? toPlayerTrack(album, disc, albumTrack) : null;
}
