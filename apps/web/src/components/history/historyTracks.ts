import { getAlbumCoverUrl } from "#/lib/utils/album";
import { albumTrackEntryToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";
import type { AlbumTrackEntry } from "#/store/audioPlayer/audioPlayerFunction";

export function toHistoryTrack<T extends AlbumTrackEntry>(entry: T) {
	const playable = albumTrackEntryToAudioPlayerTrack(entry);
	return {
		entry,
		playable,
		noAudioSource: !playable,
		coverUrl: getAlbumCoverUrl(entry.cover),
	};
}

export type HistoryTrack<T extends AlbumTrackEntry> = ReturnType<
	typeof toHistoryTrack<T>
>;
