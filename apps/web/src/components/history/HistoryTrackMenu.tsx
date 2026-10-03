import { Link } from "@tanstack/react-router";
import {
	ListPlusIcon,
	MoreHorizontalIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";

import { Button } from "#/components/coss/button";
import {
	Menu,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "#/components/coss/menu";

export function HistoryTrackMenu({
	title,
	albumId,
	trackId,
	audioDisabled,
	onPlay,
	onQueue,
	onRemove,
	removing,
}: {
	title: string;
	albumId: number | string;
	trackId: number | string;
	audioDisabled: boolean;
	onPlay: () => void;
	onQueue: () => void;
	onRemove?: () => void;
	removing?: boolean;
}) {
	return (
		<div
			className="transition-opacity md:opacity-0 md:group-focus-within/track:opacity-100 md:group-hover/track:opacity-100"
			onClick={(event) => event.stopPropagation()}
		>
			<Menu>
				<Button
					aria-label={`Open menu for ${title}`}
					render={<MenuTrigger />}
					size="icon-sm"
					variant="ghost"
				>
					<MoreHorizontalIcon aria-hidden="true" />
				</Button>
				<MenuPopup align="end" className="w-44" sideOffset={6}>
					<MenuItem disabled={audioDisabled} onClick={onPlay}>
						<PlayIcon aria-hidden="true" />
						Play
					</MenuItem>
					<MenuItem disabled={audioDisabled} onClick={onQueue}>
						<ListPlusIcon aria-hidden="true" />
						Add to queue
					</MenuItem>
					<MenuLinkItem
						render={
							<Link
								to="/albums/$id"
								params={{ id: String(albumId) }}
								search={{ track: Number(trackId) }}
							/>
						}
					>
						Go to album
					</MenuLinkItem>
					{onRemove && (
						<>
							<MenuSeparator />
							<MenuItem
								variant="destructive"
								disabled={removing}
								onClick={onRemove}
							>
								<Trash2Icon aria-hidden="true" />
								Remove from history
							</MenuItem>
						</>
					)}
				</MenuPopup>
			</Menu>
		</div>
	);
}
