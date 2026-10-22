import type { AlbumDetails } from "#/components/album/detail/albumDetail";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { albumTrackDetailsToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";

type PlaylistEntry = PlaylistDetails["entries"][number];

export function playlistEntryToTrack(
	entry: PlaylistEntry,
	album: AlbumDetails | undefined,
) {
	const disc = album?.discs.find(
		(item) => String(item.albumDiscId) === String(entry.albumDiscId),
	);
	const track = disc?.tracks.find(
		(item) => String(item.trackId) === String(entry.trackId),
	);
	if (!album || !disc || !track?.audios.length) return null;
	return albumTrackDetailsToAudioPlayerTrack(album, disc, track);
}
