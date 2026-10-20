import { useAlbumDetails } from "#/components/album/useAlbumDetails";
import type { components } from "#/data/APIschema";
import { playlistEntryCoverUrl } from "#/lib/utils/playlist";
import { albumTrackDetailsToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";

type HistoryTrackEntry = Pick<
	components["schemas"]["ListeningHistoryTrackCount"],
	"albumId" | "albumDiscId" | "trackId"
>;

export function useHistoryTracks<T extends HistoryTrackEntry>(entries: T[]) {
    // LOL STUPID AI, I WILL FUCK THIS LATER
	const albums = useAlbumDetails(entries.map((entry) => entry.albumId));

	return entries.map((entry) => {
		const album = albums.byId.get(String(entry.albumId));
		const disc = album?.discs.find(
			(item) => String(item.albumDiscId) === String(entry.albumDiscId),
		);
		const track = disc?.tracks.find(
			(item) => String(item.trackId) === String(entry.trackId),
		);
		const playable =
			album && disc && track?.audios.length
				? albumTrackDetailsToAudioPlayerTrack(album, disc, track)
				: null;
		return {
			entry,
			track,
			playable,
			noAudioSource: album !== undefined && !playable,
			coverUrl: playlistEntryCoverUrl(entry, album),
		};
	});
}

export type HistoryTrack<T extends HistoryTrackEntry> = ReturnType<
	typeof useHistoryTracks<T>
>[number];
