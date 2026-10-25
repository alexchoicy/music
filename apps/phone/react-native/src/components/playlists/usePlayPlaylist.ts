import { onlineManager, useQueryClient } from "@tanstack/react-query";

import { useOfflineStore } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { findPlayerTrack } from "@/player/track";
import { fetchAlbum } from "@/queries/albums";
import { playlistQueries } from "@/queries/playlists";
import { showToast } from "@/store/toastStore";

/** Plays a playlist from its first playable entry, e.g. from a tile's play button. */
export function usePlayPlaylist() {
	const queryClient = useQueryClient();
	const playTracks = usePlayerStore((state) => state.playTracks);

	return async (playlistId: number | string) => {
		try {
			const playlist = await queryClient.fetchQuery({
				...playlistQueries.detail(playlistId),
				staleTime: 60 * 1000,
			});
			const albumIds = [
				...new Set(playlist.entries.map((entry) => String(entry.albumId))),
			];
			// An album that fails to load skips only its own entries, like the playlist page.
			const results = await Promise.allSettled(
				albumIds.map((id) => fetchAlbum(queryClient, id)),
			);
			const albums = new Map(
				results.flatMap((result, index) =>
					result.status === "fulfilled"
						? [[albumIds[index], result.value] as const]
						: [],
				),
			);
			const downloads = useOfflineStore.getState().tracks;
			const isOnline = onlineManager.isOnline();
			// Like the playlist page: every entry online, downloads offline.
			const tracks = playlist.entries.flatMap((entry) => {
				const album = albums.get(String(entry.albumId));
				const track =
					album && findPlayerTrack(album, entry.albumDiscId, entry.trackId);
				return track &&
					(isOnline || downloads[track.trackId]?.status === "downloaded")
					? [track]
					: [];
			});
			if (tracks.length === 0) {
				showToast("Couldn't play. This playlist has no playable tracks.");
				return;
			}
			playTracks(tracks, 0, {
				shuffle: false,
				playlist: { id: String(playlistId) },
			});
		} catch {
			showToast("Couldn't play. Check your connection and try again.");
		}
	};
}
