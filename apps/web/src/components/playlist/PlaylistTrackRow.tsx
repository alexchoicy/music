import { useSortable } from "@dnd-kit/react/sortable";
import { Link } from "@tanstack/react-router";
import { GripVerticalIcon } from "lucide-react";

import type { AlbumTrack } from "#/components/album/detail/albumDetail";
import { Button } from "#/components/base/button";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { TrackActionsMenu } from "#/components/track/TrackActionsMenu";
import { TrackRow } from "#/components/track/TrackRow";
import { useTitleLang } from "#/hooks/use-title-lang";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

type PlaylistTrackRowProps = {
	entry: PlaylistDetails["entries"][number];
	index: number;
	playlistId: PlaylistDetails["playlistId"];
	disabled: boolean;
	// Reorder mode: rows drag by their grip handle only.
	editing: boolean;
	audioDisabled: boolean;
	noAudioSource: boolean;
	coverUrl: string | null;
	credits: AlbumTrack["credits"] | undefined;
	isCurrent: boolean;
	isPlaying: boolean;
	onPlay: () => void;
	onQueue: () => void;
	onRemove: () => void;
};

export function PlaylistTrackRow({
	entry,
	index,
	playlistId,
	disabled,
	editing,
	audioDisabled,
	noAudioSource,
	coverUrl,
	credits,
	isCurrent,
	isPlaying,
	onPlay,
	onQueue,
	onRemove,
}: PlaylistTrackRowProps) {
	const titleLang = useTitleLang();
	const { ref, handleRef, isDragging } = useSortable({
		id: String(entry.entryId),
		index,
		group: `playlist-${playlistId}`,
		disabled: disabled || !editing,
	});

	return (
		<TrackRow
			badges={noAudioSource ? [{ label: "No audio", outline: true }] : []}
			className={cn(isDragging && "z-20 bg-accent shadow-pop")}
			coverUrl={coverUrl}
			isCurrent={isCurrent}
			isPlaying={isPlaying}
			leading={
				editing ? (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label={`Drag ${entry.title} to reorder, position ${index + 1}`}
									className="relative z-10 cursor-grab touch-none active:cursor-grabbing"
									disabled={disabled}
									ref={handleRef}
									size="icon-sm"
									variant="ghost"
								/>
							}
						>
							<GripVerticalIcon aria-hidden="true" />
						</TooltipTrigger>
						<TooltipPopup>Drag to reorder</TooltipPopup>
					</Tooltip>
				) : undefined
			}
			menu={
				<TrackActionsMenu
					albumId={entry.albumId}
					audioDisabled={audioDisabled}
					onPlay={onPlay}
					onQueue={onQueue}
					remove={{ label: "Remove from playlist", onRemove, disabled }}
					title={entry.title}
					trackId={entry.trackId}
				/>
			}
			number={index + 1}
			onPlay={onPlay}
			playDisabled={audioDisabled}
			ref={ref}
			subtitle={
				credits === undefined
					? "—"
					: credits.length === 0
						? "No credits"
						: credits.map((credit, creditIndex) => (
								<span key={`${credit.partyId}-${credit.creditType}`}>
									{creditIndex > 0 && ", "}
									<Link
										className="rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
										params={{ id: String(credit.partyId) }}
										to="/parties/$id"
									>
										{credit.name}
									</Link>
								</span>
							))
			}
			title={entry.title}
			titleLang={titleLang(entry.languageId, entry.albumLanguageId)}
			trailing={
				<span className="hidden text-[13px] font-medium text-muted-foreground tabular-nums sm:block">
					{formatMsToMMSSOrHMMSS(Number(entry.durationInMs))}
				</span>
			}
		/>
	);
}
