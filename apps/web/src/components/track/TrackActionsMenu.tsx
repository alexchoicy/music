import { Link } from "@tanstack/react-router";
import {
	Disc3Icon,
	EllipsisIcon,
	ListPlusIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";

import { Button } from "#/components/base/button";
import {
	Menu,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "#/components/base/menu";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";

type TrackActionsMenuProps = {
	title: string;
	albumId: number | string;
	trackId: number | string;
	audioDisabled: boolean;
	onPlay: () => void;
	onQueue: () => void;
	remove?: { label: string; onRemove: () => void; disabled?: boolean };
};

export function TrackActionsMenu({
	title,
	albumId,
	trackId,
	audioDisabled,
	onPlay,
	onQueue,
	remove,
}: TrackActionsMenuProps) {
	return (
		<Menu>
			<Tooltip>
				<TooltipTrigger
					render={
						<MenuTrigger
							render={
								<Button
									aria-label={`Open menu for ${title}`}
									size="icon-sm"
									variant="ghost"
								/>
							}
						/>
					}
				>
					<EllipsisIcon aria-hidden="true" />
				</TooltipTrigger>
				<TooltipPopup>More options</TooltipPopup>
			</Tooltip>
			<MenuPopup align="end" className="w-52" sideOffset={6}>
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
							params={{ id: String(albumId) }}
							search={{ track: Number(trackId) }}
							to="/albums/$id"
						/>
					}
				>
					<Disc3Icon aria-hidden="true" />
					Go to album
				</MenuLinkItem>
				{remove && (
					<>
						<MenuSeparator />
						<MenuItem
							disabled={remove.disabled}
							onClick={remove.onRemove}
							variant="destructive"
						>
							<Trash2Icon aria-hidden="true" />
							{remove.label}
						</MenuItem>
					</>
				)}
			</MenuPopup>
		</Menu>
	);
}
