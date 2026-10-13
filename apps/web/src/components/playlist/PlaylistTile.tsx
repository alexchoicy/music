import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ListEndIcon,
	ListMusicIcon,
	PencilIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";

import {
	ContextMenu,
	ContextMenuItem,
	ContextMenuLinkItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import { toastManager } from "#/components/base/toast";
import {
	PlaylistActionsMenu,
	usePlaylistManagement,
} from "#/components/playlist/PlaylistActionsMenu";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { playlistEntryToTrack } from "#/components/playlist/playlistTracks";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import {
	playlistCoverEntries,
	playlistEntryCoverUrl,
} from "#/lib/utils/playlist";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

export function PlaylistTile({ playlist }: { playlist: PlaylistListItem }) {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const manage = usePlaylistManagement(playlist);
	const trackCount = Number(playlist.trackCount);
	const { data: details } = useQuery({
		...playlistQueries.detail(user.id, playlist.playlistId),
		enabled: trackCount > 0,
	});
	const coverEntries = playlistCoverEntries(
		trackCount > 0 ? (details?.entries ?? []) : [],
	);
	const albumIds = [
		...new Set(coverEntries.map((entry) => String(entry.albumId))),
	];
	const albums = useQueries({
		queries: albumIds.map((id) => albumQueries.getAlbum(id)),
	});
	const coverUrls = coverEntries.map((entry) =>
		playlistEntryCoverUrl(
			entry,
			albums[albumIds.indexOf(String(entry.albumId))]?.data,
		),
	);
	const meta =
		trackCount === 0
			? "Empty playlist"
			: `${trackCount} ${trackCount === 1 ? "track" : "tracks"} · ${
					formatDurationInHoursAndMinutes(Number(playlist.totalDurationInMs)) ??
					"0m"
				}`;

	async function playOrQueue(queue: boolean) {
		try {
			const playlistDetails = await queryClient.ensureQueryData(
				playlistQueries.detail(user.id, playlist.playlistId),
			);
			const tracks = await Promise.all(
				playlistDetails.entries.map(async (entry) =>
					playlistEntryToTrack(
						entry,
						await queryClient.ensureQueryData(
							albumQueries.getAlbum(String(entry.albumId)),
						),
					),
				),
			);
			const playable = tracks.filter((track) => track !== null);
			if (playable.length === 0) throw new Error("No playable tracks.");
			if (!queue) {
				playAlbum(playable);
				return;
			}
			addToQueue(playable);
			toastManager.add({
				type: "success",
				title: "Added to queue",
				description: `${playable.length} tracks from ${playlist.name}`,
			});
		} catch (error) {
			toastManager.add({
				title: `Could not play ${playlist.name}`,
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div className="group/tile relative flex min-w-0 flex-col gap-3" />
					}
				>
					<div className="transition-transform duration-150 ease-out group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
						<PlaylistArtwork className="w-full" coverUrls={coverUrls} />
					</div>
					<div className="flex min-w-0 items-start gap-2">
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<Link
								className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
								params={{ id: String(playlist.playlistId) }}
								title={playlist.name}
								to="/playlists/$id"
							>
								{playlist.name}
							</Link>
							<span className="truncate text-xs text-muted-foreground">
								{meta}
							</span>
						</div>
						<div className="relative z-10 -me-1 opacity-100 transition-opacity group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 md:opacity-0">
							<PlaylistActionsMenu playlist={playlist} />
						</div>
					</div>
				</ContextMenuTrigger>
				<ContextMenuPopup className="w-52">
					<ContextMenuItem
						disabled={trackCount === 0}
						onClick={() => void playOrQueue(false)}
					>
						<PlayIcon aria-hidden="true" />
						Play
					</ContextMenuItem>
					<ContextMenuItem
						disabled={trackCount === 0}
						onClick={() => void playOrQueue(true)}
					>
						<ListEndIcon aria-hidden="true" />
						Add to queue
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuLinkItem
						render={
							<Link
								params={{ id: String(playlist.playlistId) }}
								to="/playlists/$id"
							/>
						}
					>
						<ListMusicIcon aria-hidden="true" />
						Open playlist
					</ContextMenuLinkItem>
					<ContextMenuItem onClick={manage.rename}>
						<PencilIcon aria-hidden="true" />
						Rename…
					</ContextMenuItem>
					<ContextMenuItem onClick={manage.remove} variant="destructive">
						<Trash2Icon aria-hidden="true" />
						Delete…
					</ContextMenuItem>
				</ContextMenuPopup>
			</ContextMenu>
			{manage.dialogs}
		</>
	);
}
