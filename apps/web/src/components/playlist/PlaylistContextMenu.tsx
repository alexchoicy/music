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
import { usePlaylistManagement } from "#/components/playlist/PlaylistActionsMenu";
import { usePlayPlaylist } from "#/components/playlist/usePlayPlaylist";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";

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
	const playPlaylist = usePlayPlaylist();
	const manage = usePlaylistManagement(playlist);
	const isEmpty = Number(playlist.trackCount) === 0;

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
						onClick={() => void playPlaylist(playlist)}
					>
						<PlayIcon aria-hidden="true" />
						Play
					</ContextMenuItem>
					<ContextMenuItem
						disabled={isEmpty}
						onClick={() => void playPlaylist(playlist, { queue: true })}
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
