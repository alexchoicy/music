import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Disc3Icon } from "lucide-react";
import { z } from "zod";

import { AlbumCreditsCard } from "#/components/albums/AlbumCreditsCard";
import { AlbumDetailHero } from "#/components/albums/AlbumDetailHero";
import { AlbumInfoCard } from "#/components/albums/AlbumInfoCard";
import { AlbumTrackListCard } from "#/components/albums/AlbumTrackListCard";
import { Button } from "#/components/coss/button";
import { NewEmptyState, NewPage } from "#/components/new/NewPage";
import { albumQueries } from "#/lib/queries/album.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export const Route = createFileRoute("/new/_authed/albums/$id")({
	validateSearch: z.object({ track: z.coerce.number().optional() }),
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(albumQueries.getAlbum(params.id)),
	component: RouteComponent,
	errorComponent: () => (
		<NewPage>
			<NewEmptyState
				description="This album may have been removed, or the server is unavailable."
				icon={<Disc3Icon />}
				title="Album unavailable"
			/>
		</NewPage>
	),
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { track } = Route.useSearch();
	const { data: album } = useSuspenseQuery(albumQueries.getAlbum(id));
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const tracks = albumDetailsToAudioPlayerTracks(album);
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	useHotkey("Control+Q", () => addToQueue(tracks));

	return (
		<main className="relative min-h-full overflow-hidden">
			{coverUrl ? (
				<div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]">
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-20 blur-3xl saturate-150"
						src={coverUrl}
					/>
					<div className="absolute inset-0 bg-linear-to-b from-background/20 to-background" />
				</div>
			) : null}
			<NewPage className="relative max-w-[1440px] gap-7">
				<Button
					className="w-fit text-muted-foreground"
					render={<Link to="/new/albums" />}
					size="sm"
					variant="ghost"
				>
					<ArrowLeftIcon />
					Albums
				</Button>
				<AlbumDetailHero
					album={album}
					onAddToQueue={() => addToQueue(tracks)}
					onPlayAlbum={() => playAlbum(tracks)}
					playAlbumDisabled={!tracks.length}
					routePrefix="/new"
				/>
				<div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
					<AlbumTrackListCard
						album={album}
						highlightedTrackKey={track ? `track-${track}` : undefined}
						routePrefix="/new"
					/>
					<aside className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
						<AlbumCreditsCard album={album} routePrefix="/new" />
						<AlbumInfoCard album={album} />
					</aside>
				</div>
			</NewPage>
		</main>
	);
}
