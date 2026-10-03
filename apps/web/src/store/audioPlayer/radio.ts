import type { components } from "#/data/APIschema";
import { $APIFetch } from "#/lib/APIFetchClient";
import { trackActions } from "#/lib/queries/track.queries";

import { albumTrackDetailsToAudioPlayerTrack } from "./audioPlayerFunction";
import type { AudioPlayerTrack } from "./audioPlayerType";

// Picks a random unqueued Music track, preferring the queue's languages.
export async function fetchRadioTrack(
	queue: AudioPlayerTrack[],
	includeInstrumental: boolean,
): Promise<AudioPlayerTrack | null> {
	const radioTrack = await trackActions.radio({
		queueTrackIds: [...new Set(queue.map((track) => Number(track.trackId)))],
		includeInstrumental,
	});
	if (!radioTrack) return null;

	const result = await $APIFetch<components["schemas"]["AlbumDetails"]>(
		`/albums/${radioTrack.albumId}`,
	);
	if (!result.ok) throw result.error;

	const album = result.data;
	const disc = album.discs.find(
		(item) => String(item.albumDiscId) === String(radioTrack.albumDiscId),
	);
	const track = disc?.tracks.find(
		(item) => String(item.trackId) === String(radioTrack.trackId),
	);
	if (!disc || !track?.audios.length) return null;

	return albumTrackDetailsToAudioPlayerTrack(album, disc, track);
}
