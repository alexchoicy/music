import { PlayIcon } from "lucide-react";

import type { AlbumTrack } from "#/components/albums/albumDetailUtils";
import { getCreditNames } from "#/components/albums/albumDetailUtils";
import { Badge } from "#/components/coss/badge";
import { PlaylistArtwork } from "#/components/playlists/PlaylistArtwork";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

export function HistoryTrackCover({
	coverUrl,
	isCurrent,
}: {
	coverUrl: string | null;
	isCurrent: boolean;
}) {
	return (
		<div className="relative size-10 shrink-0">
			<PlaylistArtwork coverUrls={[coverUrl]} className="size-10 rounded-lg" />
			<span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 opacity-0 transition-opacity group-hover/track:opacity-100">
				<PlayIcon
					aria-hidden="true"
					className={cn(
						"size-4",
						isCurrent ? "text-destructive" : "text-foreground",
					)}
				/>
			</span>
		</div>
	);
}

export function HistoryTrackTitle({
	title,
	track,
	albumTitle,
	noAudioSource,
	isCurrent,
}: {
	title: string;
	track: AlbumTrack | undefined;
	albumTitle: string;
	noAudioSource: boolean;
	isCurrent: boolean;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				<span
					className={cn(
						"min-w-0 truncate font-medium",
						isCurrent && "text-destructive",
					)}
				>
					{title}
				</span>
				{track && track.versionType !== "Original" && (
					<Badge size="sm" variant="secondary">
						{track.versionType}
					</Badge>
				)}
				{noAudioSource && (
					<Badge size="sm" variant="outline">
						No audio source
					</Badge>
				)}
			</div>
			<p className="truncate text-sm text-muted-foreground">
				{track ? getCreditNames(track.credits) || "No credits" : "—"}
				<span className="hidden md:inline"> · {albumTitle}</span>
			</p>
		</div>
	);
}

export function HistoryTrackRow({
	title,
	albumTitle,
	durationInMs,
	coverUrl,
	track,
	noAudioSource,
	isCurrent,
	trailing,
	menu,
	onPlay,
}: {
	title: string;
	albumTitle: string;
	durationInMs: number | string;
	coverUrl: string | null;
	track: AlbumTrack | undefined;
	noAudioSource: boolean;
	isCurrent: boolean;
	trailing: React.ReactNode;
	menu: React.ReactNode;
	onPlay: () => void;
}) {
	return (
		<li
			className="group/track grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-3 text-sm outline-none hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto_auto] sm:px-6 sm:text-base"
			tabIndex={0}
			onClick={onPlay}
			onKeyDown={(event) => {
				if (event.key === "Enter" && event.target === event.currentTarget)
					onPlay();
			}}
		>
			<HistoryTrackCover coverUrl={coverUrl} isCurrent={isCurrent} />
			<HistoryTrackTitle
				title={title}
				track={track}
				albumTitle={albumTitle}
				noAudioSource={noAudioSource}
				isCurrent={isCurrent}
			/>
			<span className="hidden text-sm text-muted-foreground tabular-nums sm:block">
				{formatMsToMMSSOrHMMSS(Number(durationInMs))}
			</span>
			{trailing}
			{menu}
		</li>
	);
}
