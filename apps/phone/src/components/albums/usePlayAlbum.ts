import { onlineManager, useQueryClient } from "@tanstack/react-query";

import { useOfflineStore } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { toPlayerTracks } from "@/player/track";
import { fetchAlbum } from "@/queries/albums";
import { showToast } from "@/store/toastStore";

/** Plays an album from its first playable track, e.g. from a tile's play button. */
export function usePlayAlbum() {
	const queryClient = useQueryClient();
	const playTracks = usePlayerStore((state) => state.playTracks);

	return async (albumId: string) => {
		try {
			const album = await fetchAlbum(queryClient, albumId);
			const downloads = useOfflineStore.getState().tracks;
			const isOnline = onlineManager.isOnline();
			// Like the album page: every track online, downloads offline.
			const tracks = toPlayerTracks(album).filter(
				(track) =>
					isOnline || downloads[track.trackId]?.status === "downloaded",
			);
			if (tracks.length === 0) {
				showToast("Couldn't play. This album has no playable audio.");
				return;
			}
			playTracks(tracks, 0, { shuffle: false });
		} catch {
			showToast("Couldn't play. Check your connection and try again.");
		}
	};
}
