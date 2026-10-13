import { move } from "@dnd-kit/helpers";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import {
	useMutation,
	useQueries,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowUpDownIcon,
	CheckIcon,
	ListMusicIcon,
	ListPlusIcon,
	PlayIcon,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { toastManager } from "#/components/base/toast";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { PlaylistActionsMenu } from "#/components/playlist/PlaylistActionsMenu";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { PlaylistTrackRow } from "#/components/playlist/PlaylistTrackRow";
import { playlistEntryToTrack } from "#/components/playlist/playlistTracks";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { authQueries } from "#/lib/queries/auth.queries";
import {
	playlistActions,
	playlistQueries,
} from "#/lib/queries/playlist.queries";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";
import {
	playlistCoverEntries,
	playlistEntryCoverUrl,
} from "#/lib/utils/playlist";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import type { AudioPlayerTrack } from "#/store/audioPlayer/audioPlayerType";

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
	const [editing, setEditing] = useState(false);
	const navigate = useNavigate();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);

	function queueTracks(tracks: AudioPlayerTrack[]) {
		if (tracks.length === 0) return;
		addToQueue(tracks);
		const first = tracks.at(0);
		toastManager.add({
			type: "success",
			title: "Added to queue",
			description:
				tracks.length === 1 && first
					? first.title
					: `${tracks.length} tracks from ${playlist.name}`,
		});
	}
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const isPlaying = useAudioPlayerStore(
		(state) => state.status === "playing" || state.status === "loading",
	);
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
		const track = playlistEntryToTrack(entry, albumForEntry(entry));
		return track ? [{ entryId: entry.entryId, track }] : [];
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
	const trackCount = playlist.entries.length;
	const durationLabel =
		formatDurationInHoursMinutesSeconds(
			playlist.entries.reduce(
				(total, entry) => total + Number(entry.durationInMs),
				0,
			),
		) ?? "0s";
	const cannotPlay = loadingAudio || failedAudio || audioTracks.length === 0;
	const canReorder = trackCount > 1;

	return (
		<main className="mx-auto flex min-h-full w-full max-w-[1120px] min-w-0 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
			<nav
				aria-label="Breadcrumb"
				className="flex gap-1.5 text-xs text-muted-foreground"
			>
				<Link
					className="rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
					to="/playlists"
				>
					Playlists
				</Link>
				<span aria-hidden="true">/</span>
				<span aria-current="page" className="truncate text-foreground">
					{playlist.name}
				</span>
			</nav>

			<header className="flex flex-wrap items-end gap-6 sm:gap-8">
				<PlaylistArtwork
					className="size-40 shrink-0 rounded-4xl shadow-pop sm:size-60"
					coverUrls={coverUrls}
				/>
				<div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-4">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">
							Playlist
						</p>
						<h1 className="text-3xl font-bold tracking-[-.03em] wrap-anywhere sm:text-5xl sm:leading-[52px]">
							{playlist.name}
						</h1>
						<p className="text-xs text-muted-foreground">
							{trackCount} {trackCount === 1 ? "track" : "tracks"} ·{" "}
							{durationLabel}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							disabled={cannotPlay}
							onClick={() => playAlbum(audioTracks)}
							size="lg"
						>
							<PlayIcon aria-hidden="true" />
							Play
						</Button>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Add to queue"
										disabled={cannotPlay}
										onClick={() => queueTracks(audioTracks)}
										size="icon-lg"
										variant="secondary"
									/>
								}
							>
								<ListPlusIcon aria-hidden="true" />
							</TooltipTrigger>
							<TooltipPopup>Add all tracks to the queue</TooltipPopup>
						</Tooltip>
						{canReorder && (
							<Button
								aria-pressed={editing}
								onClick={() => setEditing((value) => !value)}
								size="lg"
								variant={editing ? "secondary" : "outline"}
							>
								{editing ? (
									<CheckIcon aria-hidden="true" />
								) : (
									<ArrowUpDownIcon aria-hidden="true" />
								)}
								{editing ? "Done" : "Edit order"}
							</Button>
						)}
						<PlaylistActionsMenu
							disabled={mutation.isPending}
							onDeleted={() => navigate({ to: "/playlists" })}
							playlist={playlist}
						/>
					</div>
				</div>
			</header>

			{failedAudio && (
				<Alert variant="error">
					<AlertDescription>
						Some albums could not be loaded for playback.{" "}
						<Button
							onClick={() => {
								for (const album of albums)
									if (album.isError) void album.refetch();
							}}
							size="sm"
							variant="ghost"
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}
			{loadingAudio && (
				<p className="text-sm text-muted-foreground" role="status">
					Loading playback sources…
				</p>
			)}

			{trackCount === 0 ? (
				<LibraryEmptyState
					description="Open an album and use Add to playlist to choose tracks for this collection."
					icon={<ListMusicIcon aria-hidden="true" />}
					title="Your playlist is empty"
				/>
			) : (
				<section aria-label="Playlist tracks">
					<DragDropProvider
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
						sensors={playlistSensors}
					>
						<ol className="flex flex-col gap-0.5">
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
										audioDisabled={loadingAudio || failedAudio || !playable}
										coverUrl={playlistEntryCoverUrl(entry, album)}
										credits={track?.credits}
										disabled={mutation.isPending}
										editing={editing && canReorder}
										entry={entry}
										index={index}
										isCurrent={
											currentTrack?.albumId === String(entry.albumId) &&
											currentTrack.trackId === String(entry.trackId)
										}
										isPlaying={isPlaying}
										key={entry.entryId}
										noAudioSource={!loadingAudio && !failedAudio && !playable}
										onPlay={() => {
											if (playable)
												playAlbum(audioTracks, playable.track.trackId);
										}}
										onQueue={() => {
											if (playable) queueTracks([playable.track]);
										}}
										onRemove={() =>
											mutation.mutate({
												kind: "remove",
												entryId: entry.entryId,
											})
										}
										playlistId={playlist.playlistId}
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
