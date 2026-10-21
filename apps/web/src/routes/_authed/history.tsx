import {
	useMutation,
	useQueryClient,
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HistoryIcon } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { toastManager } from "#/components/base/toast";
import { HistoryCountsTable } from "#/components/history/HistoryCountsTable";
import { toHistoryTrack } from "#/components/history/historyTracks";
import type { HistoryTrack } from "#/components/history/historyTracks";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { TrackActionsMenu } from "#/components/track/TrackActionsMenu";
import { TrackRow } from "#/components/track/TrackRow";
import { useUserInfo } from "#/context/UserInfoContext";
import { useTitleLang } from "#/hooks/use-title-lang";
import { historyActions, historyQueries } from "#/lib/queries/history.queries";
import type { ListeningHistoryEntry } from "#/lib/queries/history.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import type { AudioPlayerTrack } from "#/store/audioPlayer/audioPlayerType";
import { onListeningHistoryRecorded } from "#/store/audioPlayer/listeningHistory";

export const Route = createFileRoute("/_authed/history")({
	// Play times are grouped in the browser's time zone.
	ssr: "data-only",
	validateSearch: z.object({
		tab: z.enum(["recent", "counts"]).optional(),
	}),
	loader: async ({ context }) => {
		const userId = context.userInfo.id;
		await Promise.all([
			context.queryClient.infiniteQuery({
				...historyQueries.list(userId),
				staleTime: "static",
			}),
			context.queryClient.query({
				...historyQueries.counts(userId),
				staleTime: "static",
			}),
		]);
	},
	component: HistoryPage,
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

function dayKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(date: Date) {
	const today = new Date();
	if (dayKey(date) === dayKey(today)) return "Today";
	today.setDate(today.getDate() - 1);
	if (dayKey(date) === dayKey(today)) return "Yesterday";
	return dayFormatter.format(date);
}

function groupByDay(tracks: HistoryTrack<ListeningHistoryEntry>[]) {
	const groups: { key: string; label: string; tracks: typeof tracks }[] = [];
	for (const track of tracks) {
		const date = new Date(track.entry.playedAt);
		const key = dayKey(date);
		if (groups.at(-1)?.key !== key)
			groups.push({ key, label: formatDay(date), tracks: [] });
		groups.at(-1)!.tracks.push(track);
	}
	return groups;
}

function plural(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function HistoryPage() {
	const user = useUserInfo();
	const { tab = "recent" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
	} = useSuspenseInfiniteQuery(historyQueries.list(user.id));
	const { data: counts } = useSuspenseQuery(historyQueries.counts(user.id));
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const isPlaying = useAudioPlayerStore(
		(state) => state.status === "playing" || state.status === "loading",
	);
	const recentTracks = data.pages
		.flatMap((page) => page.entries)
		.map(toHistoryTrack);
	const countTracks = counts.tracks.map(toHistoryTrack);
	const coverUrls = [
		...new Set(recentTracks.map((track) => track.coverUrl).filter(Boolean)),
	].slice(0, 4);
	const totalPlays = Number(counts.totalPlays);

	useEffect(
		() =>
			onListeningHistoryRecorded(() => {
				void queryClient.invalidateQueries({ queryKey: ["history", user.id] });
			}),
		[queryClient, user.id],
	);

	const removeMutation = useMutation({
		mutationFn: historyActions.remove,
		onError: (error) =>
			toastManager.add({
				type: "error",
				title: "Could not remove track from history",
				description: error.message,
			}),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["history", user.id] }),
	});

	const isCurrent = (track: {
		albumId: number | string;
		trackId: number | string;
	}) =>
		currentTrack?.albumId === String(track.albumId) &&
		currentTrack.trackId === String(track.trackId);
	const play = (playable: AudioPlayerTrack | null) => {
		if (playable) playAlbum([playable]);
	};
	const queue = (playable: AudioPlayerTrack | null) => {
		if (playable) addToQueue([playable]);
	};

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-7 p-4 sm:p-6">
			<header className="flex flex-wrap items-end gap-6">
				<PlaylistArtwork
					className="size-28 shrink-0 rounded-4xl sm:size-40"
					coverUrls={coverUrls.length > 0 ? coverUrls : [null]}
					fallbackIcon={<HistoryIcon className="size-1/3" />}
				/>
				<div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-2">
					<p className="text-xs text-muted-foreground">Library</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Listening history
					</h1>
					<p className="max-w-140 text-sm text-muted-foreground">
						A track counts after you listen to half of it, or four minutes of a
						longer track.
					</p>
					<p className="text-sm text-sidebar-foreground">
						<span className="tabular-nums">{totalPlays}</span>{" "}
						{totalPlays === 1 ? "play" : "plays"} ·{" "}
						<span className="tabular-nums">{Number(counts.trackCount)}</span>{" "}
						{Number(counts.trackCount) === 1 ? "track" : "tracks"}
					</p>
				</div>
			</header>

			{totalPlays === 0 ? (
				<LibraryEmptyState
					description="Tracks appear here after you listen to half of them, or four minutes of longer tracks."
					icon={<HistoryIcon aria-hidden="true" />}
					title="No listening history yet"
				/>
			) : (
				<Tabs
					onValueChange={(value) =>
						navigate({
							search: { tab: value === "counts" ? "counts" : undefined },
							replace: true,
						})
					}
					value={tab}
				>
					<TabsList
						aria-label="History view"
						className="mb-5"
						variant="underline"
					>
						<TabsTab value="recent">Recent</TabsTab>
						<TabsTab value="counts">Play counts</TabsTab>
					</TabsList>

					<TabsPanel value="recent">
						<div className="flex flex-col gap-6">
							{groupByDay(recentTracks).map((group) => (
								<section
									aria-label={group.label}
									className="flex flex-col gap-1"
									key={group.key}
								>
									<div className="flex items-baseline justify-between gap-4 px-3 pb-1">
										<h2 className="text-base font-semibold">{group.label}</h2>
										<span className="text-xs text-muted-foreground">
											{plural(group.tracks.length, "play")}
										</span>
									</div>
									<ol>
										{group.tracks.map((item) => (
											<RecentRow
												current={isCurrent(item.entry)}
												isPlaying={isPlaying}
												item={item}
												key={item.entry.entryId}
												onPlay={() => play(item.playable)}
												onQueue={() => queue(item.playable)}
												onRemove={() =>
													removeMutation.mutate(item.entry.entryId)
												}
												removing={removeMutation.isPending}
											/>
										))}
									</ol>
								</section>
							))}
							{isFetchNextPageError && (
								<Alert variant="error">
									<AlertDescription>
										Could not load older history.
									</AlertDescription>
								</Alert>
							)}
							{hasNextPage && (
								<Button
									className="self-center"
									disabled={isFetchingNextPage}
									onClick={() => void fetchNextPage()}
									variant="outline"
								>
									{isFetchingNextPage ? "Loading…" : "Load more"}
								</Button>
							)}
						</div>
					</TabsPanel>

					<TabsPanel value="counts">
						<HistoryCountsTable
							isCurrent={isCurrent}
							isPlaying={isPlaying}
							onPlay={play}
							onQueue={queue}
							tracks={countTracks}
						/>
					</TabsPanel>
				</Tabs>
			)}
		</main>
	);
}

function RecentRow({
	item,
	current,
	isPlaying,
	onPlay,
	onQueue,
	onRemove,
	removing,
}: {
	item: HistoryTrack<ListeningHistoryEntry>;
	current: boolean;
	isPlaying: boolean;
	onPlay: () => void;
	onQueue: () => void;
	onRemove: () => void;
	removing: boolean;
}) {
	const { entry, playable, noAudioSource, coverUrl } = item;
	const titleLang = useTitleLang();
	const badges = [
		...(entry.versionType !== "Original" ? [{ label: entry.versionType }] : []),
		...(noAudioSource ? [{ label: "No audio", outline: true }] : []),
	];

	return (
		<TrackRow
			badges={badges}
			coverUrl={coverUrl}
			isCurrent={current}
			isPlaying={isPlaying}
			menu={
				<TrackActionsMenu
					albumId={entry.albumId}
					audioDisabled={!playable}
					onPlay={onPlay}
					onQueue={onQueue}
					remove={{
						label: "Remove from history",
						onRemove,
						disabled: removing,
					}}
					title={entry.title}
					trackId={entry.trackId}
				/>
			}
			onPlay={onPlay}
			playDisabled={!playable}
			subtitle={
				<span lang={titleLang(entry.albumLanguageId)}>{entry.albumTitle}</span>
			}
			title={entry.title}
			titleLang={titleLang(entry.languageId, entry.albumLanguageId)}
			trailing={
				<>
					<span className="hidden w-14 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums sm:block">
						{formatMsToMMSSOrHMMSS(Number(entry.durationInMs))}
					</span>
					<time
						className="min-w-12 shrink-0 text-right text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums"
						dateTime={entry.playedAt}
					>
						{timeFormatter.format(new Date(entry.playedAt))}
					</time>
				</>
			}
		/>
	);
}
