import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Disc3Icon, LockIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AlbumCoversEditor } from "#/components/album/edit/AlbumCoversEditor";
import { AlbumDetailsForm } from "#/components/album/edit/AlbumDetailsForm";
import { AlbumTracksEditor } from "#/components/album/edit/AlbumTracksEditor";
import { Button } from "#/components/base/button";
import { Skeleton } from "#/components/base/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { albumEditQueries } from "#/lib/queries/albumEdit.queries";
import type { AlbumEditDetails } from "#/lib/queries/albumEdit.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { canEditContent } from "#/lib/utils/roles";
import { rethrowNotFound } from "#/lib/utils/routing";
import { AlbumExtrasTab } from "#/old-components/albums/extras/AlbumExtrasTab";
import { LibraryEmptyState } from "#/old-components/LibraryEmptyState";

const editTabs = ["details", "cover", "tracks", "extras"] as const;

function hasProcessingFiles(album: AlbumEditDetails | undefined) {
	if (!album) return false;
	const audios = album.discs.flatMap((disc) =>
		disc.tracks.flatMap((track) => track.audios),
	);
	return [
		album.cover,
		...album.discs.map((disc) => disc.cover),
		...audios,
	].some(
		(file) =>
			file &&
			file.processingStatus !== "Completed" &&
			file.processingStatus !== "Failed",
	);
}

export const Route = createFileRoute("/_authed/albums/$id_/edit")({
	validateSearch: z.object({
		tab: z.enum(editTabs).optional(),
	}),
	loader: ({ context, params }) => {
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
	const { tab = "details" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const userInfo = useUserInfo();
	const { data: album } = useSuspenseQuery(albumQueries.getAlbum(id));
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const canEdit = canEditContent(userInfo);
	const [isDirty, setIsDirty] = useState(false);
	const { data: editAlbum } = useQuery({
		...albumEditQueries.getAlbumEdit(id),
		enabled: canEdit,
		refetchInterval: (query) =>
			hasProcessingFiles(query.state.data) ? 4000 : false,
	});

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-7 p-4 sm:p-6">
			<header className="flex items-center gap-4">
				<Button
					aria-label="Back to album"
					render={<Link params={{ id }} to="/albums/$id" />}
					size="icon"
					variant="ghost"
				>
					<ArrowLeftIcon aria-hidden="true" />
				</Button>
				<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground shadow-card">
					{coverUrl ? (
						<img alt="" className="size-full object-cover" src={coverUrl} />
					) : (
						<Disc3Icon aria-hidden="true" className="size-6" />
					)}
				</div>
				<div className="min-w-0">
					<p className="text-xs text-muted-foreground">Edit album</p>
					<h1 className="text-3xl font-bold tracking-tight wrap-anywhere lg:text-4xl">
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
					<TabsList
						aria-label="Edit album"
						className="mb-6"
						variant="underline"
					>
						<TabsTab disabled={isDirty && tab !== "details"} value="details">
							Details
						</TabsTab>
						<TabsTab disabled={isDirty && tab !== "cover"} value="cover">
							Cover
						</TabsTab>
						<TabsTab disabled={isDirty && tab !== "tracks"} value="tracks">
							Tracks
						</TabsTab>
						<TabsTab disabled={isDirty && tab !== "extras"} value="extras">
							Extras
						</TabsTab>
					</TabsList>
					{editAlbum ? (
						<>
							<TabsPanel value="details">
								<div>
									<AlbumDetailsForm
										album={editAlbum}
										onDirtyChange={setIsDirty}
									/>
								</div>
							</TabsPanel>
							<TabsPanel value="cover">
								<div>
									<AlbumCoversEditor album={editAlbum} />
								</div>
							</TabsPanel>
							<TabsPanel value="tracks">
								<div>
									<AlbumTracksEditor
										album={editAlbum}
										onDirtyChange={setIsDirty}
									/>
								</div>
							</TabsPanel>
						</>
					) : (
						tab !== "extras" && (
							<div className="grid max-w-3xl gap-4">
								<Skeleton className="h-10" />
								<Skeleton className="h-40" />
							</div>
						)
					)}
					<TabsPanel value="extras">
						<div>
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
