import { useQueries } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";
import { albumQueries } from "#/lib/queries/album.queries";
import { playlistEntryCoverUrl } from "#/lib/utils/playlist";
import { albumTrackDetailsToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";

type HistoryTrackEntry = Pick<
	components["schemas"]["ListeningHistoryTrackCount"],
	"albumId" | "albumDiscId" | "trackId"
>;

// Resolves history entries against their albums for covers, credits, and playback.
export function useHistoryTracks<T extends HistoryTrackEntry>(entries: T[]) {
	const albumIds = [...new Set(entries.map((entry) => String(entry.albumId)))];
	const albums = useQueries({
		queries: albumIds.map((albumId) => albumQueries.getAlbum(albumId)),
	});

	return entries.map((entry) => {
		const album = albums[albumIds.indexOf(String(entry.albumId))];
		const disc = album.data?.discs.find(
			(item) => String(item.albumDiscId) === String(entry.albumDiscId),
		);
		const track = disc?.tracks.find(
			(item) => String(item.trackId) === String(entry.trackId),
		);
		const playable =
			album.data && disc && track?.audios.length
				? albumTrackDetailsToAudioPlayerTrack(album.data, disc, track)
				: null;
		return {
			entry,
			track,
			playable,
			noAudioSource: album.isSuccess && !playable,
			coverUrl: playlistEntryCoverUrl(entry, album.data),
		};
	});
}

export type HistoryTrack<T extends HistoryTrackEntry> = ReturnType<
	typeof useHistoryTracks<T>
>[number];
