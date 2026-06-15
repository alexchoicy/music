import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Disc3Icon } from "lucide-react";

import { AlbumCard } from "#/components/AlbumCard";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import { albumQueries } from "#/lib/queries/album.queries";

export const Route = createFileRoute("/_authed/albums/")({
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(albumQueries.getAlbums());
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: albums } = useSuspenseQuery(albumQueries.getAlbums());

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Albums
				</h1>
			</header>

			{albums.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{albums.map((album) => {
						return <AlbumCard album={album} key={album.albumId} />;
					})}
				</div>
			) : (
				<Empty className="min-h-80 rounded-2xl border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Disc3Icon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No albums yet</EmptyTitle>
						<EmptyDescription>
							Albums will appear here after they are created.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</main>
	);
}
