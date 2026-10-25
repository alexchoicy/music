import { onlineManager, useQueryClient } from "@tanstack/react-query";

import type { PartyDetails } from "@/lib/schema";
import { useOfflineStore } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { toPlayerTracks } from "@/player/track";
import { fetchAlbum } from "@/queries/albums";
import { showToast } from "@/store/toastStore";

/** Plays every track of a Party's own albums, in album order, like the web. */
export function usePlayParty() {
	const queryClient = useQueryClient();
	const playTracks = usePlayerStore((state) => state.playTracks);

	return async (party: PartyDetails, { shuffle = false } = {}) => {
		// An album that fails to load skips only its own tracks.
		const results = await Promise.allSettled(
			party.albums.map((album) => fetchAlbum(queryClient, album.albumId)),
		);
		const downloads = useOfflineStore.getState().tracks;
		const isOnline = onlineManager.isOnline();
		// Like the album page: every track online, downloads offline.
		const tracks = results
			.flatMap((result) =>
				result.status === "fulfilled" ? toPlayerTracks(result.value) : [],
			)
			.filter(
				(track) =>
					isOnline || downloads[track.trackId]?.status === "downloaded",
			);

		if (tracks.length === 0) {
			showToast(
				results.some((result) => result.status === "rejected")
					? "Couldn't play. Check your connection and try again."
					: `Couldn't play. ${party.name} has no playable tracks.`,
			);
			return;
		}
		playTracks(tracks, 0, { shuffle });
	};
}
