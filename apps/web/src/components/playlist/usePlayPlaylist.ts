import { useQueryClient } from "@tanstack/react-query";

import { toastManager } from "#/components/base/toast";
import { useUserInfo } from "#/context/UserInfoContext";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";
import { albumTrackEntryToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export function usePlayPlaylist() {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);

	return async function play(
		playlist: Pick<PlaylistListItem, "playlistId" | "name">,
		{ queue = false }: { queue?: boolean } = {},
	) {
		try {
			const playlistDetails = await queryClient.query({
				...playlistQueries.detail(user.id, playlist.playlistId),
				staleTime: "static",
			});
			const playable = playlistDetails.entries
				.map(albumTrackEntryToAudioPlayerTrack)
				.filter((track) => track !== null);
			if (playable.length === 0) throw new Error("No playable tracks.");
			if (!queue) {
				playAlbum(playable, undefined, undefined, {
					id: String(playlist.playlistId),
				});
				return;
			}
			addToQueue(playable);
			toastManager.add({
				type: "success",
				title: "Added to queue",
				description: `${playable.length} tracks from ${playlist.name}`,
			});
		} catch (error) {
			toastManager.add({
				title: `Could not play ${playlist.name}`,
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	};
}
