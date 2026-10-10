import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Disc3Icon, LockIcon } from "lucide-react";
import { z } from "zod";

import { AlbumCoverTab } from "#/components/albums/edit/AlbumCoverTab";
import { AlbumDetailsTab } from "#/components/albums/edit/AlbumDetailsTab";
import { AlbumTracksTab } from "#/components/albums/edit/AlbumTracksTab";
import { AlbumExtrasTab } from "#/components/albums/extras/AlbumExtrasTab";
import { Button } from "#/components/coss/button";
import { Skeleton } from "#/components/coss/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/coss/tabs";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { albumEditQueries } from "#/lib/queries/albumEdit.queries";
import type { AlbumEditDetails } from "#/lib/queries/albumEdit.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { canEditContent } from "#/lib/utils/roles";

const editTabs = ["details", "cover", "tracks", "extras"] as const;

function hasProcessingCover(album: AlbumEditDetails | undefined) {
	if (!album) return false;
	return [album.cover, ...album.discs.map((disc) => disc.cover)].some(
		(cover) => cover && cover.processingStatus !== "Completed",
	);
}

export const Route = createFileRoute("/_authed/albums/$id_/edit")({
	validateSearch: z.object({
		tab: z.enum(editTabs).optional(),
	}),
	loader: ({ context, params }) => {
		return context.queryClient.ensureQueryData(
			albumQueries.getAlbum(params.id),
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { tab = "details" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const userInfo = useUserInfo();
	const { data: album } = useSuspenseQuery(albumQueries.getAlbum(id));
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const canEdit = canEditContent(userInfo);
	const { data: editAlbum } = useQuery({
		...albumEditQueries.getAlbumEdit(id),
		enabled: canEdit,
		// Pick up the processed cover once the worker finishes
		refetchInterval: (query) =>
			hasProcessingCover(query.state.data) ? 4000 : false,
	});

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex items-center gap-4">
				<Button
					aria-label="Back to album"
					render={<Link params={{ id }} to="/albums/$id" />}
					size="icon"
					variant="ghost"
				>
					<ArrowLeftIcon aria-hidden="true" />
				</Button>
				<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-muted-foreground">
					{coverUrl ? (
						<img alt="" className="size-full object-cover" src={coverUrl} />
					) : (
						<Disc3Icon aria-hidden="true" className="size-6" />
					)}
				</div>
				<div className="min-w-0">
					<p className="text-sm text-muted-foreground">Edit album</p>
					<h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
						{album.title}
					</h1>
				</div>
			</header>

			{canEdit ? (
				<Tabs
					onValueChange={(value) =>
						void navigate({ search: { tab: value }, replace: true })
					}
					value={tab}
				>
					<TabsList variant="underline">
						<TabsTab value="details">Details</TabsTab>
						<TabsTab value="cover">Cover</TabsTab>
						<TabsTab value="tracks">Tracks</TabsTab>
						<TabsTab value="extras">Extras</TabsTab>
					</TabsList>
					{editAlbum ? (
						<>
							<TabsPanel value="details">
								<div className="mt-6">
									<AlbumDetailsTab album={editAlbum} />
								</div>
							</TabsPanel>
							<TabsPanel value="cover">
								<div className="mt-6">
									<AlbumCoverTab album={editAlbum} />
								</div>
							</TabsPanel>
							<TabsPanel value="tracks">
								<div className="mt-6">
									<AlbumTracksTab album={editAlbum} />
								</div>
							</TabsPanel>
						</>
					) : (
						tab !== "extras" && (
							<div className="mt-6 grid max-w-3xl gap-4">
								<Skeleton className="h-10" />
								<Skeleton className="h-40" />
							</div>
						)
					)}
					<TabsPanel value="extras">
						<div className="mt-6">
							<AlbumExtrasTab albumId={Number(album.albumId)} />
						</div>
					</TabsPanel>
				</Tabs>
			) : (
				<LibraryEmptyState
					description="Only uploaders and admins can edit albums."
					icon={<LockIcon aria-hidden="true" />}
					title="No permission"
				/>
			)}
		</main>
	);
}
