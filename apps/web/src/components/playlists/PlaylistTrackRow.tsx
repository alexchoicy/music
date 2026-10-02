import { useDragDropMonitor } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Link } from "@tanstack/react-router";
import {
	ListPlusIcon,
	MoreHorizontalIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";
import { useRef } from "react";

import type { AlbumTrack } from "#/components/albums/albumDetailUtils";
import { Button } from "#/components/coss/button";
import {
	Menu,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "#/components/coss/menu";
import { PlaylistArtwork } from "#/components/playlists/PlaylistArtwork";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

export function PlaylistTrackRow({
	entry,
	index,
	playlistId,
	disabled,
	audioDisabled,
	noAudioSource,
	coverUrl,
	credits,
	onPlay,
	onQueue,
	onRemove,
}: {
	entry: PlaylistDetails["entries"][number];
	index: number;
	playlistId: PlaylistDetails["playlistId"];
	disabled: boolean;
	audioDisabled: boolean;
	noAudioSource: boolean;
	coverUrl: string | null;
	credits: AlbumTrack["credits"] | undefined;
	onPlay: () => void;
	onQueue: () => void;
	onRemove: () => void;
}) {
	const didDrag = useRef(false);
	const { ref, isDragging } = useSortable({
		id: String(entry.entryId),
		index,
		group: `playlist-${playlistId}`,
		disabled,
	});
	useDragDropMonitor({
		onDragStart(event) {
			if (event.operation.source?.id === String(entry.entryId)) {
				didDrag.current = true;
			}
		},
	});
	return (
		<li
			ref={ref}
			role="listitem"
			tabIndex={-1}
			aria-label={entry.title}
			aria-describedby=""
			onPointerDownCapture={() => {
				didDrag.current = false;
			}}
			onClick={(event) => {
				if (audioDisabled || didDrag.current || event.defaultPrevented) return;
				const target = event.target;
				if (
					!(target instanceof Element) ||
					!event.currentTarget.contains(target) ||
					target.closest("button, a")
				)
					return;
				onPlay();
			}}
			className={cn(
				"group relative flex cursor-grab items-center gap-3 px-3 py-3 outline-none hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:gap-4 sm:px-5",
				isDragging && "z-10 cursor-grabbing bg-muted shadow-lg",
				disabled && "cursor-default",
			)}
		>
			<div className="relative flex size-8 shrink-0 items-center justify-center">
				<span
					aria-hidden="true"
					className="text-sm text-muted-foreground tabular-nums group-focus-within:invisible group-hover:invisible [@media(hover:none)]:invisible"
				>
					{index + 1}
				</span>
				<div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label={`Play ${entry.title}`}
						disabled={audioDisabled}
						onClick={onPlay}
					>
						<PlayIcon aria-hidden="true" />
					</Button>
				</div>
			</div>
			<PlaylistArtwork
				coverUrls={[coverUrl]}
				className="size-10 shrink-0 rounded-lg"
			/>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">
					<Link
						to="/albums/$id"
						params={{ id: String(entry.albumId) }}
						search={{ track: entry.trackId }}
						className="cursor-pointer rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
					>
						{entry.title}
					</Link>
				</p>
				<p className="truncate text-sm text-muted-foreground">
					{credits
						? credits.length > 0
							? credits.map((credit, creditIndex) => (
									<span key={`${credit.partyId}-${credit.creditType}`}>
										{creditIndex > 0 && ", "}
										<Link
											to="/parties/$id"
											params={{ id: String(credit.partyId) }}
											className="cursor-pointer rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
										>
											{credit.name}
										</Link>
									</span>
								))
							: "No credits"
						: "—"}
				</p>
				{noAudioSource && (
					<p className="text-xs text-muted-foreground">No audio source</p>
				)}
			</div>
			<span className="hidden text-sm text-muted-foreground tabular-nums sm:block">
				{formatMsToMMSSOrHMMSS(Number(entry.durationInMs))}
			</span>
			<Menu>
				<MenuTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={`Track actions for ${entry.title}`}
						/>
					}
				>
					<MoreHorizontalIcon aria-hidden="true" />
				</MenuTrigger>
				<MenuPopup align="end">
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
								params={{ id: String(entry.albumId) }}
								search={{ track: entry.trackId }}
							/>
						}
					>
						Go to album
					</MenuLinkItem>
					<MenuSeparator />
					<MenuItem
						variant="destructive"
						disabled={disabled}
						onClick={onRemove}
					>
						<Trash2Icon aria-hidden="true" />
						Remove from playlist
					</MenuItem>
				</MenuPopup>
			</Menu>
		</li>
	);
}
