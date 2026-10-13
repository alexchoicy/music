import { useQueryClient } from "@tanstack/react-query";

import { toastManager } from "#/components/base/toast";
import { albumQueries } from "#/lib/queries/album.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type PlayPartyOptions = { shuffle?: boolean; queue?: boolean; next?: boolean };

export function usePlayParty() {
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const addNextToQueue = useAudioPlayerStore((state) => state.addNextToQueue);
	const toggleShuffle = useAudioPlayerStore((state) => state.toggleShuffle);

	return async function playParty(
		party: { partyId: number | string; name: string },
		{ shuffle = false, queue = false, next = false }: PlayPartyOptions = {},
	) {
		try {
			const details = await queryClient.ensureQueryData(
				partyQueries.getParty(String(party.partyId)),
			);
			const albums = await Promise.all(
				details.albums.map((album) =>
					queryClient.ensureQueryData(albumQueries.getAlbum(album.albumId)),
				),
			);
			const tracks = albums.flatMap(albumDetailsToAudioPlayerTracks);
			if (tracks.length === 0) throw new Error("No playable tracks.");

			if (queue || next) {
				if (next) addNextToQueue(tracks);
				else addToQueue(tracks);
				toastManager.add({
					type: "success",
					title: next ? "Playing next" : "Added to queue",
					description: `${tracks.length} tracks by ${party.name}`,
				});
				return;
			}
			if (shuffle && !useAudioPlayerStore.getState().shuffle) toggleShuffle();
			playAlbum(tracks);
		} catch (error) {
			toastManager.add({
				title: `Could not play ${party.name}`,
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	};
}
