import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouterState } from "@tanstack/react-router";

import { AlbumCreditsCard } from "#/components/albums/AlbumCreditsCard";
import { AlbumDetailHero } from "#/components/albums/AlbumDetailHero";
import { AlbumInfoCard } from "#/components/albums/AlbumInfoCard";
import { AlbumTrackListCard } from "#/components/albums/AlbumTrackListCard";
import { albumQueries } from "#/lib/queries/album.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export const Route = createFileRoute("/_authed/albums/$id")({
	loader: ({ context, params }) => {
		return context.queryClient.ensureQueryData(
			albumQueries.getAlbum(params.id),
		);
	},
	component: RouteComponent,
});
function RouteComponent() {
	const { id } = Route.useParams();
	const { data: album } = useSuspenseQuery(albumQueries.getAlbum(id));
	const hash = useRouterState({
		select: (state) => state.location.hash,
	});
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const audioPlayerTracks = albumDetailsToAudioPlayerTracks(album);

	return (
		<main className="relative min-h-full w-full overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden [mask-image:var(--album-bg-mask)] [--album-bg-mask:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]">
				{coverUrl && (
					<img
						alt=""
						className="absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] scale-110 object-cover opacity-30 blur-3xl saturate-150"
						src={coverUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/85 to-background" />
			</div>

			<div className="relative flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
				<AlbumDetailHero
					album={album}
					onPlayAlbum={() => playAlbum(audioPlayerTracks)}
					playAlbumDisabled={audioPlayerTracks.length === 0}
				/>

				<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
					<AlbumTrackListCard album={album} highlightedTrackKey={hash} />

					<aside className="flex flex-col gap-6">
						<AlbumCreditsCard album={album} />
						<AlbumInfoCard album={album} />
					</aside>
				</div>
			</div>
		</main>
	);
}
