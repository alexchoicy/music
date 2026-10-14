import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	ListEndIcon,
	PlayIcon,
	ShuffleIcon,
	UserIcon,
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
import { usePlayParty } from "#/components/party/usePlayParty";

type PartyContextMenuProps = {
	party: { partyId: number | string; name: string };
	// Unknown counts (e.g. credits) leave the play actions enabled.
	albumCount?: number;
	render: ReactElement;
	children: ReactNode;
};

export function PartyContextMenu({
	party,
	albumCount,
	render,
	children,
}: PartyContextMenuProps) {
	const playParty = usePlayParty();
	const noAlbums = albumCount === 0;

	return (
		<ContextMenu>
			<ContextMenuTrigger render={render}>{children}</ContextMenuTrigger>
			<ContextMenuPopup className="w-52">
				<ContextMenuItem onClick={() => void copyText(party.name)}>
					<CopyIcon aria-hidden="true" />
					Copy name
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					disabled={noAlbums}
					onClick={() => void playParty(party)}
				>
					<PlayIcon aria-hidden="true" />
					Play all
				</ContextMenuItem>
				<ContextMenuItem
					disabled={noAlbums}
					onClick={() => void playParty(party, { shuffle: true })}
				>
					<ShuffleIcon aria-hidden="true" />
					Shuffle
				</ContextMenuItem>
				<ContextMenuItem
					disabled={noAlbums}
					onClick={() => void playParty(party, { queue: true })}
				>
					<ListEndIcon aria-hidden="true" />
					Add to queue
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuLinkItem
					render={
						<Link params={{ id: String(party.partyId) }} to="/parties/$id" />
					}
				>
					<UserIcon aria-hidden="true" />
					Open page
				</ContextMenuLinkItem>
			</ContextMenuPopup>
		</ContextMenu>
	);
}
