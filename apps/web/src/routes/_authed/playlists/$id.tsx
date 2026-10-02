import { move } from "@dnd-kit/helpers";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import {
	useMutation,
	useQueries,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ListMusicIcon, ListPlusIcon, PlayIcon } from "lucide-react";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import { toastManager } from "#/components/coss/toast";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PlaylistActionsMenu } from "#/components/playlists/PlaylistActionsMenu";
import { PlaylistArtwork } from "#/components/playlists/PlaylistArtwork";
import { PlaylistTrackRow } from "#/components/playlists/PlaylistTrackRow";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { authQueries } from "#/lib/queries/auth.queries";
import {
	playlistActions,
	playlistQueries,
} from "#/lib/queries/playlist.queries";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import {
	playlistCoverEntries,
	playlistEntryCoverUrl,
} from "#/lib/utils/playlist";
import { albumTrackDetailsToAudioPlayerTrack } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export const Route = createFileRoute("/_authed/playlists/$id")({
	loader: async ({ context, params }) => {
		const user = await context.queryClient.ensureQueryData(
			authQueries.userInfo(),
		);
		return context.queryClient.ensureQueryData(
			playlistQueries.detail(user.id, params.id),
		);
	},
	component: PlaylistPage,
});

type EditPlaylist =
	| { kind: "remove"; entryId: PlaylistDetails["entries"][number]["entryId"] }
	| { kind: "reorder"; entries: PlaylistDetails["entries"] };

const playlistSensors = [PointerSensor];

function PlaylistPage() {
	const { id } = Route.useParams();
	const user = useUserInfo();
	const detailQuery = playlistQueries.detail(user.id, id);
	const saveToastId = `playlist-${id}-save`;
	const { data: playlist } = useSuspenseQuery(detailQuery);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const albumIds = [
		...new Set(playlist.entries.map((entry) => String(entry.albumId))),
	];
	const albums = useQueries({
		queries: albumIds.map((albumId) => albumQueries.getAlbum(albumId)),
	});
	const loadingAudio = albums.some((album) => album.isPending);
	const failedAudio = albums.some((album) => album.isError);
	const albumForEntry = (entry: PlaylistDetails["entries"][number]) =>
		albums[albumIds.indexOf(String(entry.albumId))]?.data;
	const coverUrls = playlistCoverEntries(playlist.entries).map((entry) =>
		playlistEntryCoverUrl(entry, albumForEntry(entry)),
	);
	const playableEntries = playlist.entries.flatMap((entry) => {
		const album = albumForEntry(entry);
		const disc = album?.discs.find(
			(item) => String(item.albumDiscId) === String(entry.albumDiscId),
		);
		const track = disc?.tracks.find(
			(item) => String(item.trackId) === String(entry.trackId),
		);
		if (!album || !disc || !track?.audios.length) return [];
		return [
			{
				entryId: entry.entryId,
				track: albumTrackDetailsToAudioPlayerTrack(album, disc, track),
			},
		];
	});
	const audioTracks = playableEntries.map((entry) => entry.track);
	const mutation = useMutation({
		mutationFn: async (action: EditPlaylist) => {
			if (action.kind === "remove")
				return playlistActions.remove(
					playlist.playlistId,
					action.entryId,
					playlist.version,
				);
			return playlistActions.reorder(playlist.playlistId, {
				version: playlist.version,
				entryIds: action.entries.map((entry) => entry.entryId),
			});
		},
		onMutate: async (action) => {
			await queryClient.cancelQueries({ queryKey: detailQuery.queryKey });
			const previous = queryClient.getQueryData(detailQuery.queryKey);
			if (action.kind === "reorder" && previous)
				queryClient.setQueryData(detailQuery.queryKey, {
					...previous,
					entries: action.entries,
				});
			toastManager.add({
				id: saveToastId,
				type: "loading",
				title: "Saving playlist…",
				description: undefined,
			});
			return { previous };
		},
		onSuccess: (_, action) => {
			toastManager.add({
				id: saveToastId,
				type: "success",
				title: action.kind === "remove" ? "Track removed" : "Playlist saved",
				description: undefined,
			});
		},
		onError: (error, _, context) => {
			if (context?.previous)
				queryClient.setQueryData(detailQuery.queryKey, context.previous);
			toastManager.add({
				id: saveToastId,
				type: "error",
				title: "Could not save playlist",
				description: error.message,
			});
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["playlists", user.id] }),
	});
	return (
		<main className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<Link
				to="/playlists"
				className="w-fit text-sm text-muted-foreground hover:text-foreground"
			>
				← Playlists
			</Link>
			<header className="flex flex-col gap-5 sm:flex-row sm:items-end">
				<PlaylistArtwork
					coverUrls={coverUrls}
					className="size-24 shrink-0 rounded-2xl sm:size-36"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Personal playlist
					</p>
					<h1 className="text-3xl font-semibold wrap-anywhere sm:text-4xl">
						{playlist.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						{playlist.entries.length} track
						{playlist.entries.length === 1 ? "" : "s"} ·{" "}
						{formatMsToMMSSOrHMMSS(
							playlist.entries.reduce(
								(total, entry) => total + Number(entry.durationInMs),
								0,
							),
						)}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							disabled={loadingAudio || failedAudio || audioTracks.length === 0}
							onClick={() => playAlbum(audioTracks)}
						>
							<PlayIcon aria-hidden="true" />
							Play
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={loadingAudio || failedAudio || audioTracks.length === 0}
							onClick={() => addToQueue(audioTracks)}
						>
							<ListPlusIcon aria-hidden="true" />
							Add to queue
						</Button>
						<PlaylistActionsMenu
							playlist={playlist}
							disabled={mutation.isPending}
							onDeleted={() => navigate({ to: "/playlists" })}
						/>
					</div>
				</div>
			</header>
			{failedAudio && (
				<Alert variant="error">
					<AlertDescription>
						Some albums could not be loaded for playback.{" "}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => {
								for (const album of albums)
									if (album.isError) void album.refetch();
							}}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}
			{loadingAudio && (
				<p role="status" className="text-sm text-muted-foreground">
					Loading playback sources…
				</p>
			)}
			{playlist.entries.length === 0 ? (
				<LibraryEmptyState
					icon={<ListMusicIcon />}
					title="Your playlist is empty"
					description="Open an album and use Add to playlist to choose tracks for this collection."
				/>
			) : (
				<section className="grid gap-3" aria-label="Playlist tracks">
					<DragDropProvider
						sensors={playlistSensors}
						onDragEnd={(event) => {
							if (event.canceled || mutation.isPending) return;
							const ids = playlist.entries.map((entry) =>
								String(entry.entryId),
							);
							const reordered = move(ids, event);
							if (reordered.every((entryId, index) => entryId === ids[index]))
								return;
							const entries = new Map(
								playlist.entries.map((entry) => [String(entry.entryId), entry]),
							);
							mutation.mutate({
								kind: "reorder",
								entries: reordered.map((entryId) => entries.get(entryId)!),
							});
						}}
					>
						<ol className="divide-y rounded-2xl border bg-card">
							{playlist.entries.map((entry, index) => {
								const album = albumForEntry(entry);
								const track = album?.discs
									.find(
										(disc) =>
											String(disc.albumDiscId) === String(entry.albumDiscId),
									)
									?.tracks.find(
										(item) => String(item.trackId) === String(entry.trackId),
									);
								const playable = playableEntries.find(
									(item) => item.entryId === entry.entryId,
								);
								return (
									<PlaylistTrackRow
										key={entry.entryId}
										entry={entry}
										index={index}
										playlistId={playlist.playlistId}
										disabled={mutation.isPending}
										audioDisabled={loadingAudio || failedAudio || !playable}
										noAudioSource={!loadingAudio && !failedAudio && !playable}
										credits={track?.credits}
										coverUrl={playlistEntryCoverUrl(entry, album)}
										onPlay={() => {
											if (playable)
												playAlbum(audioTracks, playable.track.trackId);
										}}
										onQueue={() => {
											if (playable) addToQueue([playable.track]);
										}}
										onRemove={() =>
											mutation.mutate({
												kind: "remove",
												entryId: entry.entryId,
											})
										}
									/>
								);
							})}
						</ol>
					</DragDropProvider>
				</section>
			)}
		</main>
	);
}
