import { PlayIcon } from "lucide-react";

import { PlayingBars } from "#/components/album/AlbumTile";
import { cn } from "#/lib/utils/styles";

export function TrackNumberCell({
	number,
	isCurrent,
	isPlaying,
}: {
	number: number | string;
	isCurrent: boolean;
	isPlaying: boolean;
}) {
	return (
		<div className="relative flex h-5 w-8 shrink-0 items-center">
			<span
				className={cn(
					"text-xs font-medium text-muted-foreground tabular-nums",
					!isCurrent && "group-hover/track:opacity-0",
				)}
			>
				{isCurrent && isPlaying ? (
					<PlayingBars />
				) : (
					<span className={cn(isCurrent && "text-primary")}>{number}</span>
				)}
			</span>
			{!isCurrent && (
				<PlayIcon
					aria-hidden="true"
					className="absolute left-0 size-4 opacity-0 group-hover/track:opacity-100"
				/>
			)}
		</div>
	);
}
