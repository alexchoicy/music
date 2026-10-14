import { useQueryClient } from "@tanstack/react-query";

import { toastManager } from "#/components/base/toast";
import { showQueueToast } from "#/components/player/queueToast";
import { albumQueries } from "#/lib/queries/album.queries";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type PlayAlbumOptions = { queue?: boolean; next?: boolean };

export function usePlayAlbum() {
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const addNextToQueue = useAudioPlayerStore((state) => state.addNextToQueue);

	return async function play(
		album: { albumId: number | string; title: string },
		{ queue = false, next = false }: PlayAlbumOptions = {},
	) {
		try {
			const details = await queryClient.query({
				...albumQueries.getAlbum(album.albumId),
				staleTime: "static",
			});
			const tracks = albumDetailsToAudioPlayerTracks(details);
			if (tracks.length === 0) throw new Error("No playable tracks.");

			if (next) addNextToQueue(tracks);
			else if (queue) addToQueue(tracks);
			else {
				playAlbum(tracks);
				return;
			}
			showQueueToast(album.title, { next });
		} catch (error) {
			toastManager.add({
				title: `Could not play ${album.title}`,
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	};
}
