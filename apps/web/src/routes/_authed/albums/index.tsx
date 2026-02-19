import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlbumCard } from "@/components/albumCard";
import { AppLayout } from "@/components/ui/appLayout";
import { albumQueries } from "@/lib/queries/album.queries";

export const Route = createFileRoute("/_authed/albums/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(albumQueries.list());
	},
});

//HEY COOL
function RouteComponent() {
	return (
		<AppLayout>
			<Suspense fallback={<div>Loading...</div>}>
				<AlbumsContent />
			</Suspense>
		</AppLayout>
	);
}

function AlbumsContent() {
	const { data: albums } = useSuspenseQuery(albumQueries.list());

	return (
		<div className="grid p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
			{albums.map((album) => (
				<AlbumCard key={album.albumId} album={album} />
			))}
		</div>
	);
}
