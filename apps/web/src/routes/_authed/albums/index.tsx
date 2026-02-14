import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlbumCard } from "@/components/albumCard";
import { AppLayout } from "@/components/ui/appLayout";
import { albumQueries } from "@/lib/queries/album.queries";

export const Route = createFileRoute("/_authed/albums/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(albumQueries.list());
	},
});

function RouteComponent() {
	const { data: albums } = useSuspenseQuery(albumQueries.list());

	return (
		<AppLayout>
			<Suspense fallback={<div>Loading...</div>}>
				<div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{albums.map((album) => (
						<AlbumCard key={album.albumId} album={album} />
					))}
				</div>
			</Suspense>
		</AppLayout>
	);
}
