import type { ComponentProps, ReactNode } from "react";

import { PlayingBars } from "#/components/album/AlbumTile";
import { Badge } from "#/components/base/badge";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { TrackNumberCell } from "#/components/track/TrackNumberCell";
import { cn } from "#/lib/utils/styles";

type TrackRowProps = Omit<ComponentProps<"li">, "title"> & {
	title: string;
	titleLang?: string;
	subtitle: ReactNode;
	coverUrl: string | null;
	badges?: { label: string; outline?: boolean }[];
	isCurrent?: boolean;
	isPlaying?: boolean;
	playDisabled?: boolean;
	onPlay: () => void;
	number?: number | string;
	leading?: ReactNode;
	trailing?: ReactNode;
	menu?: ReactNode;
};

export function TrackRow({
	title,
	titleLang,
	subtitle,
	coverUrl,
	badges = [],
	isCurrent = false,
	isPlaying = false,
	playDisabled = false,
	onPlay,
	number,
	leading,
	trailing,
	menu,
	className,
	...props
}: TrackRowProps) {
	const hasNumber = number !== undefined;

	return (
		<li
			className={cn(
				"group/track relative flex min-h-14 items-center gap-4 rounded-lg px-3 py-2 transition-colors duration-100 hover:bg-accent motion-reduce:transition-none",
				className,
			)}
			{...props}
		>
			{leading ??
				(hasNumber && (
					<TrackNumberCell
						isCurrent={isCurrent}
						isPlaying={isPlaying}
						number={number}
					/>
				))}
			<PlaylistArtwork
				className="size-10 shrink-0 rounded-lg"
				coverUrls={[coverUrl]}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<button
					aria-label={`Play ${title}`}
					className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring disabled:cursor-default"
					disabled={playDisabled}
					onClick={onPlay}
					type="button"
				>
					{!hasNumber && isCurrent && isPlaying && <PlayingBars />}
					<span
						className={cn(
							"min-w-0 truncate text-sm font-semibold",
							isCurrent && "text-primary",
						)}
						lang={titleLang}
					>
						{title}
					</span>
					{badges.map((badge) => (
						<Badge
							className="shrink-0"
							key={badge.label}
							variant={badge.outline ? "outline" : "secondary"}
						>
							{badge.label}
						</Badge>
					))}
				</button>
				<div className="relative z-10 w-fit max-w-full truncate text-xs text-muted-foreground">
					{subtitle}
				</div>
			</div>
			{trailing}
			{menu && (
				<div className="relative z-10 opacity-100 transition-opacity group-focus-within/track:opacity-100 group-hover/track:opacity-100 md:opacity-0">
					{menu}
				</div>
			)}
		</li>
	);
}
