import { Link } from "@tanstack/react-router";

import { PlayingBars } from "#/components/album/AlbumTile";
import type { HistoryTrack } from "#/components/history/historyTracks";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { TrackActionsMenu } from "#/components/track/TrackActionsMenu";
import { useTitleLang } from "#/hooks/use-title-lang";
import type { ListeningHistoryCounts } from "#/lib/queries/history.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import type { AudioPlayerTrack } from "#/store/audioPlayer/audioPlayerType";

type CountEntry = ListeningHistoryCounts["tracks"][number];

const lastPlayedFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

function dayKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatLastPlayed(value: string) {
	const date = new Date(value);
	const today = new Date();
	if (dayKey(date) === dayKey(today)) return "Today";
	today.setDate(today.getDate() - 1);
	if (dayKey(date) === dayKey(today)) return "Yesterday";
	return lastPlayedFormatter.format(date);
}

// Shared column widths for the header and rows, sized by the table's own
// width so the sidebar cannot squeeze the track column under fixed columns.
const COLUMNS =
	"grid grid-cols-[2rem_minmax(0,1fr)_3rem_2rem] items-center gap-x-4 @lg:grid-cols-[2rem_minmax(0,1fr)_3rem_6.5rem_2rem] @4xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_9rem_6.5rem_2rem]";

type HistoryCountsTableProps = {
	tracks: HistoryTrack<CountEntry>[];
	isCurrent: (track: {
		albumId: number | string;
		trackId: number | string;
	}) => boolean;
	isPlaying: boolean;
	onPlay: (playable: AudioPlayerTrack | null) => void;
	onQueue: (playable: AudioPlayerTrack | null) => void;
};

export function HistoryCountsTable({
	tracks,
	isCurrent,
	isPlaying,
	onPlay,
	onQueue,
}: HistoryCountsTableProps) {
	const titleLang = useTitleLang();
	const maxPlays = Math.max(
		1,
		...tracks.map(({ entry }) => Number(entry.playCount)),
	);

	return (
		<div
			aria-label="Play counts"
			className="@container flex flex-col"
			role="table"
		>
			<div
				className={cn(
					COLUMNS,
					"px-3 pb-2 text-xs font-medium text-muted-foreground",
				)}
				role="row"
			>
				<span className="text-center" role="columnheader">
					#
				</span>
				<span role="columnheader">Track</span>
				<span className="hidden @4xl:block" role="columnheader">
					Album
				</span>
				<span className="text-right" role="columnheader">
					Plays
				</span>
				<span
					className="hidden text-right whitespace-nowrap @lg:block"
					role="columnheader"
				>
					Last played
				</span>
				<span role="columnheader">
					<span className="sr-only">Actions</span>
				</span>
			</div>

			{tracks.map(({ entry, playable, coverUrl }, index) => {
				const current = isCurrent(entry);
				const plays = Number(entry.playCount);
				return (
					<div
						className={cn(
							COLUMNS,
							"group/track relative min-h-14 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-accent motion-reduce:transition-none",
						)}
						key={`${entry.albumDiscId}-${entry.trackId}`}
						role="row"
					>
						<span
							className="text-center text-xs font-medium text-muted-foreground tabular-nums"
							role="cell"
						>
							{index + 1}
						</span>
						<div className="flex min-w-0 items-center gap-3" role="cell">
							<PlaylistArtwork
								className="size-10 shrink-0 rounded-lg"
								coverUrls={[coverUrl]}
							/>
							<div className="flex min-w-0 flex-col">
								<button
									aria-label={`Play ${entry.title}`}
									className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring disabled:cursor-default"
									disabled={!playable}
									onClick={() => onPlay(playable)}
									type="button"
								>
									{current && isPlaying && <PlayingBars />}
									<span
										className={cn(
											"truncate text-sm font-semibold",
											current && "text-primary",
										)}
										lang={titleLang(entry.languageId, entry.albumLanguageId)}
									>
										{entry.title}
									</span>
								</button>
								<span className="text-xs text-muted-foreground tabular-nums">
									{formatMsToMMSSOrHMMSS(Number(entry.durationInMs))}
								</span>
							</div>
						</div>
						<span className="hidden min-w-0 @4xl:block" role="cell">
							<Link
								className="relative z-10 block truncate rounded-xs text-sm text-sidebar-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								lang={titleLang(entry.albumLanguageId)}
								params={{ id: String(entry.albumId) }}
								to="/albums/$id"
							>
								{entry.albumTitle}
							</Link>
						</span>
						<span className="flex items-center justify-end gap-3" role="cell">
							<span
								aria-hidden="true"
								className="hidden h-1 w-24 overflow-hidden rounded-full bg-border @4xl:block"
							>
								<span
									className="block h-full rounded-full bg-primary"
									style={{ width: `${(plays / maxPlays) * 100}%` }}
								/>
							</span>
							<span className="w-7 text-right text-sm font-medium tabular-nums">
								{plays}
							</span>
						</span>
						<time
							className="hidden text-right text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums @lg:block"
							dateTime={entry.lastPlayedAt}
							role="cell"
						>
							{formatLastPlayed(entry.lastPlayedAt)}
						</time>
						<span
							className="relative z-10 opacity-100 transition-opacity group-focus-within/track:opacity-100 group-hover/track:opacity-100 md:pointer-fine:opacity-0"
							role="cell"
						>
							<TrackActionsMenu
								albumId={entry.albumId}
								audioDisabled={!playable}
								onPlay={() => onPlay(playable)}
								onQueue={() => onQueue(playable)}
								title={entry.title}
								trackId={entry.trackId}
							/>
						</span>
					</div>
				);
			})}
		</div>
	);
}
