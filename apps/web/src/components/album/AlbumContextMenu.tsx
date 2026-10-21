import type * as API from "@music/api";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	Disc3Icon,
	ListEndIcon,
	ListPlusIcon,
	ListStartIcon,
	PlayIcon,
	Share2Icon,
	UserIcon,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { shareAlbumLink } from "#/components/album/detail/albumDetail";
import type { AlbumDetails } from "#/components/album/detail/albumDetail";
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
import { AddToPlaylistDialog } from "#/components/playlist/AddToPlaylistDialog";
import { albumQueries } from "#/lib/queries/album.queries";
import type { PlaylistTrackRequest } from "#/lib/queries/playlist.queries";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type Album = API.AlbumListItem;

export function AlbumContextMenu({
	album,
	className,
	children,
}: {
	album: Album;
	className?: string;
	children: ReactNode;
}) {
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const addNextToQueue = useAudioPlayerStore((state) => state.addNextToQueue);
	const [playlistTracks, setPlaylistTracks] = useState<
		PlaylistTrackRequest[] | null
	>(null);

	async function withAlbum(
		action: (details: AlbumDetails) => void | Promise<void>,
	) {
		try {
			const details = await queryClient.query({
				...albumQueries.getAlbum(album.albumId),
				staleTime: "static",
			});
			await action(details);
		} catch (error) {
			toastManager.add({
				title: `Could not load ${album.title}`,
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	}

	function queue(next: boolean) {
		void withAlbum((details) => {
			const tracks = albumDetailsToAudioPlayerTracks(details);
			if (next) addNextToQueue(tracks);
			else addToQueue(tracks);
			toastManager.add({
				type: "success",
				title: next ? "Playing next" : "Added to queue",
				description: album.title,
			});
		});
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger render={<div className={className} />}>
					{children}
				</ContextMenuTrigger>
				<ContextMenuPopup className="w-56">
					<ContextMenuItem onClick={() => void copyText(album.title)}>
						<CopyIcon aria-hidden="true" />
						Copy name
					</ContextMenuItem>
					{album.artists.length > 0 && (
						<ContextMenuItem
							onClick={() =>
								void copyText(
									album.artists.map((artist) => artist.name).join(", "),
								)
							}
						>
							<CopyIcon aria-hidden="true" />
							Copy artists
						</ContextMenuItem>
					)}
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() =>
							void withAlbum((details) =>
								playAlbum(albumDetailsToAudioPlayerTracks(details)),
							)
						}
					>
						<PlayIcon aria-hidden="true" />
						Play
					</ContextMenuItem>
					<ContextMenuItem onClick={() => queue(true)}>
						<ListStartIcon aria-hidden="true" />
						Play next
					</ContextMenuItem>
					<ContextMenuItem onClick={() => queue(false)}>
						<ListEndIcon aria-hidden="true" />
						Add to queue
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() =>
							void withAlbum((details) =>
								setPlaylistTracks(
									details.discs.flatMap((disc) =>
										disc.tracks.map((track) => ({
											albumDiscId: disc.albumDiscId,
											trackId: track.trackId,
										})),
									),
								),
							)
						}
					>
						<ListPlusIcon aria-hidden="true" />
						Add to playlist…
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuLinkItem
						render={
							<Link params={{ id: String(album.albumId) }} to="/albums/$id" />
						}
					>
						<Disc3Icon aria-hidden="true" />
						Go to album
					</ContextMenuLinkItem>
					{album.artists.slice(0, 3).map((artist) => (
						<ContextMenuLinkItem
							key={artist.partyId}
							render={
								<Link
									params={{ id: String(artist.partyId) }}
									to="/parties/$id"
								/>
							}
						>
							<UserIcon aria-hidden="true" />
							<span className="truncate">Go to {artist.name}</span>
						</ContextMenuLinkItem>
					))}
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => void withAlbum((details) => shareAlbumLink(details))}
					>
						<Share2Icon aria-hidden="true" />
						Share
					</ContextMenuItem>
				</ContextMenuPopup>
			</ContextMenu>

			{playlistTracks && (
				<AddToPlaylistDialog
					onClose={() => setPlaylistTracks(null)}
					tracks={playlistTracks}
				/>
			)}
		</>
	);
}
