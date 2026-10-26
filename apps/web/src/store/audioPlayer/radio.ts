import type * as API from "@music/api";

import { $APIFetch } from "#/lib/APIFetchClient";
import { trackActions } from "#/lib/queries/track.queries";

import { albumTrackDetailsToAudioPlayerTrack } from "./audioPlayerFunction";
import type {
	AudioPlayerQueueEntry,
	AudioPlayerTrack,
} from "./audioPlayerType";

async function fetchAlbum(albumId: string): Promise<API.AlbumDetails | null> {
	const result = await $APIFetch<API.AlbumDetails>(`/albums/${albumId}`);
	if (!result.ok) {
		console.log("[audio-player] radio:album fetch failed", result.error);
		return null;
	}
	return result.data;
}

export async function fetchRadioTracks(
	queue: AudioPlayerQueueEntry[],
	upcomingIndices: number[],
	includeInstrumental: boolean,
): Promise<AudioPlayerTrack[]> {
	const toTrackId = (entry: AudioPlayerQueueEntry) => Number(entry.trackId);
	const upcoming = new Set(upcomingIndices);
	const radioTracks = await trackActions.radio({
		baseTrackIds: queue.filter((entry) => !entry.radio).map(toTrackId),
		playedRadioTrackIds: queue
			.filter((entry, i) => entry.radio && !upcoming.has(i))
			.map(toTrackId),
		upcomingTrackIds: upcomingIndices.map((i) => toTrackId(queue[i])),
		includeInstrumental,
	});

	const albumIds = [
		...new Set(radioTracks.map((item) => String(item.albumId))),
	];
	const albums = new Map(
		await Promise.all(
			albumIds.map(
				async (albumId) => [albumId, await fetchAlbum(albumId)] as const,
			),
		),
	);

	return radioTracks.flatMap((radioTrack) => {
		const album = albums.get(String(radioTrack.albumId));
		const disc = album?.discs.find(
			(item) => String(item.albumDiscId) === String(radioTrack.albumDiscId),
		);
		const track = disc?.tracks.find(
			(item) => String(item.trackId) === String(radioTrack.trackId),
		);
		if (!album || !disc || !track?.audios.length) return [];
		return [albumTrackDetailsToAudioPlayerTrack(album, disc, track)];
	});
}
