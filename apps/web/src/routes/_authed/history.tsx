import {
	useMutation,
	useQueryClient,
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDaysIcon, HistoryIcon } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Card } from "#/components/coss/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/coss/tabs";
import { toastManager } from "#/components/coss/toast";
import { HistoryTrackMenu } from "#/components/history/HistoryTrackMenu";
import {
	HistoryTrackCover,
	HistoryTrackRow,
	HistoryTrackTitle,
} from "#/components/history/HistoryTrackRow";
import { useHistoryTracks } from "#/components/history/useHistoryTracks";
import type { HistoryTrack } from "#/components/history/useHistoryTracks";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PlaylistArtwork } from "#/components/playlists/PlaylistArtwork";
import { useUserInfo } from "#/context/UserInfoContext";
import { authQueries } from "#/lib/queries/auth.queries";
import { historyActions, historyQueries } from "#/lib/queries/history.queries";
import type { ListeningHistoryEntry } from "#/lib/queries/history.queries";
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
		const user = await context.queryClient.ensureQueryData(
			authQueries.userInfo(),
		);
		await Promise.all([
			context.queryClient.ensureInfiniteQueryData(historyQueries.list(user.id)),
			context.queryClient.ensureQueryData(historyQueries.counts(user.id)),
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

const lastPlayedFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
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
	const recentTracks = useHistoryTracks(
		data.pages.flatMap((page) => page.entries),
	);
	const countTracks = useHistoryTracks(tab === "counts" ? counts.tracks : []);
	const coverUrls = [
		...new Set(recentTracks.map((track) => track.coverUrl).filter(Boolean)),
	].slice(0, 4);
	const totalPlays = Number(counts.totalPlays);
	const backgroundUrl = coverUrls.at(0);

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
		<main className="relative min-h-full w-full overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden [mask-image:var(--album-bg-mask)] [--album-bg-mask:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]">
				{backgroundUrl && (
					<img
						alt=""
						className="absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] scale-110 object-cover opacity-30 blur-3xl saturate-150"
						src={backgroundUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/85 to-background" />
			</div>

			<div className="relative min-h-full w-full p-4 sm:p-6">
				<Tabs
					value={tab}
					onValueChange={(value) =>
						navigate({
							search: { tab: value === "counts" ? "counts" : undefined },
							replace: true,
						})
					}
				>
					<div className="flex flex-col gap-4 sm:gap-6">
						<section className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 sm:flex sm:flex-col sm:gap-5 md:flex-row md:items-end">
							{coverUrls.length > 0 ? (
								<PlaylistArtwork
									coverUrls={coverUrls}
									className="w-24 shrink-0 rounded-2xl border shadow-sm/5 sm:w-56 md:w-64"
								/>
							) : (
								<div className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-2xl border bg-muted text-muted-foreground shadow-sm/5 sm:w-56 md:w-64">
									<HistoryIcon aria-hidden="true" className="size-14" />
								</div>
							)}

							<div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
								<div className="flex min-w-0 flex-col gap-2">
									<Badge className="w-fit" variant="secondary">
										History
									</Badge>
									<h1 className="font-heading text-xl font-semibold tracking-tight break-words sm:text-4xl">
										Listening history
									</h1>
									<p className="text-sm text-muted-foreground sm:text-base">
										Tracks count after you listen to half of them, or four
										minutes of longer tracks.
									</p>
									<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
										<span>{plural(totalPlays, "play")}</span>
										<span aria-hidden="true">&middot;</span>
										<span>{plural(Number(counts.trackCount), "track")}</span>
									</div>
								</div>
								{totalPlays > 0 && (
									<TabsList>
										<TabsTab value="recent">Recent</TabsTab>
										<TabsTab value="counts">Play counts</TabsTab>
									</TabsList>
								)}
							</div>
						</section>

						{totalPlays === 0 ? (
							<LibraryEmptyState
								icon={<HistoryIcon />}
								title="No listening history yet"
								description="Tracks appear here after you listen to half of them, or four minutes of longer tracks."
							/>
						) : (
							<>
								<TabsPanel value="recent">
									<div className="flex flex-col gap-4">
										<Card className="overflow-hidden">
											{groupByDay(recentTracks).map((group) => (
												<section
													key={group.key}
													className="border-b last:border-b-0"
													aria-label={group.label}
												>
													<div className="flex items-center justify-between gap-4 bg-muted/35 px-4 py-3 text-sm sm:px-6">
														<div className="flex min-w-0 items-center gap-2 font-semibold tracking-wide text-muted-foreground uppercase">
															<CalendarDaysIcon
																aria-hidden="true"
																className="size-4 shrink-0"
															/>
															<span className="truncate">{group.label}</span>
														</div>
														<span className="shrink-0 text-muted-foreground">
															{plural(group.tracks.length, "play")}
														</span>
													</div>
													<ol className="divide-y">
														{group.tracks.map(
															({
																entry,
																track,
																playable,
																noAudioSource,
																coverUrl,
															}) => (
																<HistoryTrackRow
																	key={entry.entryId}
																	title={entry.title}
																	albumTitle={entry.albumTitle}
																	durationInMs={entry.durationInMs}
																	coverUrl={coverUrl}
																	track={track}
																	noAudioSource={noAudioSource}
																	isCurrent={isCurrent(entry)}
																	onPlay={() => play(playable)}
																	trailing={
																		<time
																			dateTime={entry.playedAt}
																			className="w-12 text-right text-sm text-muted-foreground tabular-nums"
																		>
																			{timeFormatter.format(
																				new Date(entry.playedAt),
																			)}
																		</time>
																	}
																	menu={
																		<HistoryTrackMenu
																			title={entry.title}
																			albumId={entry.albumId}
																			trackId={entry.trackId}
																			audioDisabled={!playable}
																			onPlay={() => play(playable)}
																			onQueue={() => queue(playable)}
																			removing={removeMutation.isPending}
																			onRemove={() =>
																				removeMutation.mutate(entry.entryId)
																			}
																		/>
																	}
																/>
															),
														)}
													</ol>
												</section>
											))}
										</Card>
										{isFetchNextPageError && (
											<Alert variant="error">
												<AlertDescription>
													Could not load older history.
												</AlertDescription>
											</Alert>
										)}
										{hasNextPage && (
											<Button
												type="button"
												variant="outline"
												className="self-center"
												disabled={isFetchingNextPage}
												onClick={() => void fetchNextPage()}
											>
												{isFetchingNextPage ? "Loading…" : "Load more"}
											</Button>
										)}
									</div>
								</TabsPanel>

								<TabsPanel value="counts">
									<Card className="overflow-hidden">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-12 text-center">#</TableHead>
													<TableHead>Track</TableHead>
													<TableHead className="hidden lg:table-cell">
														Album
													</TableHead>
													<TableHead className="text-right">Plays</TableHead>
													<TableHead className="hidden sm:table-cell">
														Last played
													</TableHead>
													<TableHead>
														<span className="sr-only">Actions</span>
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{countTracks.map(
													(
														{ entry, track, playable, noAudioSource, coverUrl },
														index,
													) => (
														<TableRow
															key={`${entry.albumDiscId}-${entry.trackId}`}
															className="group/track cursor-pointer"
															onClick={() => play(playable)}
														>
															<TableCell className="text-center">
																<span className="text-muted-foreground tabular-nums">
																	{index + 1}
																</span>
															</TableCell>
															<TableCell className="w-full max-w-0">
																<div className="flex min-w-0 items-center gap-3">
																	<HistoryTrackCover
																		coverUrl={coverUrl}
																		isCurrent={isCurrent(entry)}
																	/>
																	<HistoryTrackTitle
																		title={entry.title}
																		track={track}
																		albumTitle={entry.albumTitle}
																		noAudioSource={noAudioSource}
																		isCurrent={isCurrent(entry)}
																	/>
																</div>
															</TableCell>
															<TableCell className="hidden lg:table-cell">
																<span className="block max-w-48 truncate text-muted-foreground">
																	{entry.albumTitle}
																</span>
															</TableCell>
															<TableCell className="text-right">
																<span className="font-medium tabular-nums">
																	{entry.playCount}
																</span>
															</TableCell>
															<TableCell className="hidden sm:table-cell">
																<time
																	dateTime={entry.lastPlayedAt}
																	className="text-muted-foreground tabular-nums"
																>
																	{lastPlayedFormatter.format(
																		new Date(entry.lastPlayedAt),
																	)}
																</time>
															</TableCell>
															<TableCell>
																<HistoryTrackMenu
																	title={entry.title}
																	albumId={entry.albumId}
																	trackId={entry.trackId}
																	audioDisabled={!playable}
																	onPlay={() => play(playable)}
																	onQueue={() => queue(playable)}
																/>
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</Card>
								</TabsPanel>
							</>
						)}
					</div>
				</Tabs>
			</div>
		</main>
	);
}
