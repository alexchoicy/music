import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { AlbumAbout, AlbumCredits } from "#/components/album/detail/AlbumAside";
import { AlbumHero } from "#/components/album/detail/AlbumHero";
import { AlbumTrackList } from "#/components/album/detail/AlbumTrackList";
import { AlbumExtras } from "#/components/album/extras/AlbumExtras";
import { showQueueToast } from "#/components/player/queueToast";
import { AddToPlaylistDialog } from "#/components/playlist/AddToPlaylistDialog";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import type { PlaylistTrackRequest } from "#/lib/queries/playlist.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { canEditContent } from "#/lib/utils/roles";
import { rethrowNotFound } from "#/lib/utils/routing";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export const Route = createFileRoute("/_authed/albums/$id")({
	validateSearch: z.object({
		track: z.coerce.number().optional(),
	}),
	loader: async ({ context, params }) => {
		return context.queryClient
			.query({
				...albumQueries.getAlbum(params.id),
				staleTime: "static",
			})
			.catch(rethrowNotFound);
	},
	component: RouteComponent,
});
function RouteComponent() {
	const { id } = Route.useParams();
	const { track } = Route.useSearch();
	const { data: album } = useSuspenseQuery(albumQueries.getAlbum(id));
	const userInfo = useUserInfo();
	const [playlistTracks, setPlaylistTracks] = useState<
		PlaylistTrackRequest[] | null
	>(null);
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const audioPlayerTracks = albumDetailsToAudioPlayerTracks(album);

	function queueAlbum() {
		if (audioPlayerTracks.length === 0) return;
		addToQueue(audioPlayerTracks);
		showQueueToast(`${audioPlayerTracks.length} tracks from ${album.title}`);
	}

	useHotkey("Control+Q", queueAlbum);

	return (
		<main className="relative min-h-full w-full overflow-hidden">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden"
			>
				{coverUrl && (
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-50 blur-[64px] saturate-[1.3] motion-reduce:hidden"
						src={coverUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/94 via-80% to-background" />
			</div>

			<div className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
				<AlbumHero
					album={album}
					canEdit={canEditContent(userInfo)}
					canPlay={audioPlayerTracks.length > 0}
					onAddToPlaylist={() =>
						setPlaylistTracks(
							album.discs.flatMap((disc) =>
								disc.tracks.map((albumTrack) => ({
									albumDiscId: disc.albumDiscId,
									trackId: albumTrack.trackId,
								})),
							),
						)
					}
					onAddToQueue={queueAlbum}
					onPlay={() => playAlbum(audioPlayerTracks)}
				/>

				<div className="flex flex-wrap items-start gap-12">
					<div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
						<AlbumTrackList
							album={album}
							highlightedTrackId={track}
							onAddToPlaylist={(playlistTrack) =>
								setPlaylistTracks([playlistTrack])
							}
						/>
					</div>

					<aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-8 lg:max-w-[360px]">
						<AlbumCredits album={album} />
						<AlbumAbout album={album} />
					</aside>
				</div>

				<AlbumExtras extras={album.extras} />
			</div>

			{playlistTracks && (
				<AddToPlaylistDialog
					onClose={() => setPlaylistTracks(null)}
					tracks={playlistTracks}
				/>
			)}
		</main>
	);
}
