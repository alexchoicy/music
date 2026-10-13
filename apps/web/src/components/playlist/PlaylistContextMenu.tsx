import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	ListEndIcon,
	ListMusicIcon,
	PencilIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { copyText } from "#/components/app/copyText";
import {
	ContextMenu,
	ContextMenuItem,
	ContextMenuLinkItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import { toastManager } from "#/components/base/toast";
import { usePlaylistManagement } from "#/components/playlist/PlaylistActionsMenu";
import { playlistEntryToTrack } from "#/components/playlist/playlistTracks";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type PlaylistContextMenuProps = {
	playlist: PlaylistListItem;
	render: ReactElement;
	children: ReactNode;
};

export function PlaylistContextMenu({
	playlist,
	render,
	children,
}: PlaylistContextMenuProps) {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const manage = usePlaylistManagement(playlist);
	const isEmpty = Number(playlist.trackCount) === 0;

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
				<ContextMenuTrigger render={render}>{children}</ContextMenuTrigger>
				<ContextMenuPopup className="w-52">
					<ContextMenuItem onClick={() => void copyText(playlist.name)}>
						<CopyIcon aria-hidden="true" />
						Copy name
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						disabled={isEmpty}
						onClick={() => void playOrQueue(false)}
					>
						<PlayIcon aria-hidden="true" />
						Play
					</ContextMenuItem>
					<ContextMenuItem
						disabled={isEmpty}
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
