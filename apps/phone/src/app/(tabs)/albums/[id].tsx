import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

import { AlbumDownloadButton } from "@/components/albums/albumDownloadButton";
import { AlbumPlayButtons } from "@/components/albums/albumPlayButtons";
import { CreditRow } from "@/components/parties/creditRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/ui/detailHeader";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import type { AlbumDetails, AlbumTrack } from "@/lib/album";
import {
	formatReleaseDate,
	getAlbumCover,
	getTrackBadges,
	getTrackOnlyCredits,
} from "@/lib/album";
import { cn } from "@/lib/cn";
import { formatTotalDuration, formatTrackDuration } from "@/lib/duration";
import { useClearTabHistory } from "@/lib/navigation";
import {
	getTrackAvailability,
	useArtworkUri,
	useIsOnline,
} from "@/lib/offline/media";
import type { PlayerTrack } from "@/lib/player/track";
import { toPlayerTracks } from "@/lib/player/track";
import { albumQueries } from "@/lib/queries/album.queries";
import { useOfflineStore } from "@/store/offlineStore";
import { usePlayerStore } from "@/store/playerStore";

const maxCoverSize = 280;

/** The album's tracks that can play now: all of them online, downloads offline. */
function usePlayableTracks(album: AlbumDetails) {
	const isOnline = useIsOnline();
	const downloads = useOfflineStore((state) => state.tracks);
	return toPlayerTracks(album).filter(
		(track) => isOnline || downloads[track.trackId]?.status === "downloaded",
	);
}

export default function AlbumDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const album = useQuery(albumQueries.getAlbum(id));
	return (
		<Screen>
			<DetailHeader />
			{album.data ? (
				<ScrollView
					contentContainerClassName="gap-8 px-4 pt-2 pb-6"
					refreshControl={
						<RefreshControl
							colorsClassName="accent-muted-foreground"
							onRefresh={() => void album.refetch()}
							refreshing={album.isRefetching}
							tintColorClassName="accent-muted-foreground"
						/>
					}
				>
					<AlbumContent album={album.data} />
					<Credits album={album.data} />
				</ScrollView>
			) : album.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : (
				<EmptyState
					action={
						<Button
							loading={album.isFetching}
							onPress={() => void album.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="It may have been removed, or the server is unreachable."
					title="Unable to load album"
				/>
			)}
		</Screen>
	);
}

function AlbumContent({ album }: { album: AlbumDetails }) {
	const tracks = usePlayableTracks(album);
	return (
		<>
			<AlbumHero album={album} tracks={tracks} />
			<TrackList album={album} tracks={tracks} />
		</>
	);
}

type AlbumTracksProps = {
	album: AlbumDetails;
	/** Tracks that can play now, in album order. */
	tracks: PlayerTrack[];
};

function AlbumHero({ album, tracks }: AlbumTracksProps) {
	const clearTabHistory = useClearTabHistory();
	const { width } = useWindowDimensions();
	const coverSize = Math.min(width * 0.62, maxCoverSize);
	const coverUrl = useArtworkUri(getAlbumCover(album.cover.album));
	const trackCount = Number(album.totalTrackCount);
	const meta = [
		album.type,
		formatReleaseDate(album.releaseDate),
		`${trackCount} ${trackCount === 1 ? "track" : "tracks"}`,
		formatTotalDuration(album.totalDurationInMs),
	].filter(Boolean);

	return (
		<View className="items-center gap-4">
			<View
				className="overflow-hidden rounded-xl bg-muted"
				style={{ width: coverSize, height: coverSize }}
			>
				{coverUrl ? (
					<Image
						accessibilityLabel={`${album.title} cover`}
						contentFit="cover"
						source={coverUrl}
						style={{ width: "100%", height: "100%" }}
						transition={150}
					/>
				) : (
					<View className="flex-1 items-center justify-center">
						<Icon
							className="accent-muted-foreground"
							name={{ ios: "opticaldisc", android: "album", web: "album" }}
							size={48}
						/>
					</View>
				)}
			</View>
			<View className="w-full items-center gap-1">
				<Text
					accessibilityRole="header"
					className="text-center text-xl font-semibold text-foreground"
				>
					{album.title}
				</Text>
				<Text className="text-center text-sm text-muted-foreground">
					{album.credits.length > 0
						? album.credits.map((credit, index) => (
								<Fragment key={`${credit.partyId}-${credit.creditType}`}>
									{index > 0 && ", "}
									<Link
										className="font-medium text-foreground"
										href={{
											pathname: "/parties/[id]",
											params: { id: String(credit.partyId) },
										}}
										onPress={(event) => clearTabHistory("parties", event)}
										push
										suppressHighlighting={false}
										withAnchor
									>
										{credit.name}
									</Link>
								</Fragment>
							))
						: "Unknown artist"}
				</Text>
				<Text className="text-center text-xs text-muted-foreground">
					{meta.join(" · ")}
				</Text>
			</View>
			<View className="w-full flex-row items-center">
				<AlbumDownloadButton album={album} />
				<View className="ml-auto">
					<AlbumPlayButtons albumId={String(album.albumId)} tracks={tracks} />
				</View>
			</View>
		</View>
	);
}

function TrackList({ album, tracks }: AlbumTracksProps) {
	const playTracks = usePlayerStore((state) => state.playTracks);

	const hasTracks = album.discs.some((disc) => disc.tracks.length > 0);
	if (!hasTracks) {
		return (
			<Text className="text-center text-sm text-muted-foreground">
				This album has no tracks yet.
			</Text>
		);
	}

	const showDiscHeaders = album.discs.length > 1;

	return (
		<View className="gap-6">
			{album.discs.map((disc) => (
				<View key={disc.albumDiscId}>
					{showDiscHeaders && (
						<View className="flex-row items-center gap-2 pb-2">
							<Icon
								className="accent-muted-foreground"
								name={{ ios: "opticaldisc", android: "album", web: "album" }}
								size={14}
							/>
							<Text
								accessibilityRole="header"
								className="flex-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
								numberOfLines={1}
							>
								Disc {disc.discNumber}
								{disc.subtitle ? ` · ${disc.subtitle}` : ""}
							</Text>
						</View>
					)}
					{disc.tracks.map((track) => (
						<TrackRow
							key={track.trackId}
							onPlay={(playerTrack) =>
								playTracks(tracks, tracks.indexOf(playerTrack))
							}
							playerTrack={tracks.find(
								(item) => item.trackId === String(track.trackId),
							)}
							track={track}
						/>
					))}
				</View>
			))}
		</View>
	);
}

const availabilityLabels = {
	local: "Downloaded",
	stream: null,
	unavailable: "Not available offline",
};

type TrackRowProps = {
	track: AlbumTrack;
	/** Undefined when the track cannot play now. */
	playerTrack?: PlayerTrack;
	onPlay: (track: PlayerTrack) => void;
};

function TrackRow({ track, playerTrack, onPlay }: TrackRowProps) {
	const trackId = String(track.trackId);
	const isCurrent = usePlayerStore(
		(state) => state.queue.at(state.index)?.trackId === trackId,
	);
	const playNext = usePlayerStore((state) => state.playNext);
	const addToQueue = usePlayerStore((state) => state.addToQueue);
	const download = useOfflineStore((state) => state.tracks[trackId]);
	const progress = useOfflineStore((state) => state.progress[trackId]);
	const isOnline = useIsOnline();
	const availability = getTrackAvailability(
		download,
		track.audios.length > 0,
		isOnline,
	);
	const credits = track.credits.map((credit) => credit.name).join(", ");
	const badges = getTrackBadges(track);
	const duration = formatTrackDuration(track.durationInMs);

	function showActions() {
		if (!playerTrack) return;
		Alert.alert(track.title, undefined, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Add to queue", onPress: () => addToQueue([playerTrack]) },
			{ text: "Play next", onPress: () => playNext([playerTrack]) },
		]);
	}

	return (
		<Pressable
			accessibilityActions={
				playerTrack
					? [
							{ name: "activate" },
							{ name: "playNext", label: "Play next" },
							{ name: "addToQueue", label: "Add to queue" },
						]
					: undefined
			}
			accessibilityHint={
				playerTrack ? "Plays the album from this track" : undefined
			}
			accessibilityLabel={[
				isCurrent ? "Now playing" : null,
				`Track ${track.trackNumber}`,
				track.title,
				...badges,
				credits,
				duration,
				availabilityLabels[availability],
				download?.status === "queued" ? "Waiting to download" : null,
				download?.status === "downloading"
					? `Downloading${progress === undefined ? "" : ` ${Math.round(progress * 100)}%`}`
					: null,
				download?.status === "failed" ? "Download failed" : null,
			]
				.filter(Boolean)
				.join(", ")}
			accessibilityRole="button"
			accessibilityState={{ disabled: !playerTrack, selected: isCurrent }}
			className={cn(
				"min-h-14 flex-row items-center gap-3 py-2 active:opacity-70",
				availability === "unavailable" && "opacity-50",
			)}
			disabled={!playerTrack}
			onAccessibilityAction={(event) => {
				if (!playerTrack) return;
				if (event.nativeEvent.actionName === "playNext")
					playNext([playerTrack]);
				else if (event.nativeEvent.actionName === "addToQueue")
					addToQueue([playerTrack]);
				else onPlay(playerTrack);
			}}
			onLongPress={showActions}
			onPress={() => playerTrack && onPlay(playerTrack)}
		>
			{isCurrent ? (
				<View className="w-6 items-center">
					<Icon
						name={{ ios: "waveform", android: "graphic_eq", web: "graphic_eq" }}
						size={16}
					/>
				</View>
			) : (
				<Text className="w-6 text-center text-sm text-muted-foreground tabular-nums">
					{track.trackNumber}
				</Text>
			)}
			<View className="flex-1 gap-0.5">
				<View className="flex-row items-center gap-1.5">
					<Text
						className={cn(
							"shrink text-sm text-foreground",
							isCurrent ? "font-semibold" : "font-medium",
						)}
						numberOfLines={1}
					>
						{track.title}
					</Text>
					{badges.map((badge) => (
						<Badge key={badge} label={badge} />
					))}
				</View>
				{!!credits && (
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{credits}
					</Text>
				)}
			</View>
			{download?.status === "downloading" && progress !== undefined ? (
				<Text className="text-xs text-muted-foreground tabular-nums">
					{Math.round(progress * 100)}%
				</Text>
			) : download?.status === "downloaded" ? (
				<Icon
					className="accent-muted-foreground"
					name={{
						ios: "arrow.down.circle.fill",
						android: "download_done",
						web: "download_done",
					}}
					size={14}
				/>
			) : download?.status === "failed" ? (
				<Icon
					className="accent-destructive"
					name={{
						ios: "exclamationmark.circle",
						android: "error",
						web: "error",
					}}
					size={14}
				/>
			) : null}
			<Text className="text-xs text-muted-foreground tabular-nums">
				{duration}
			</Text>
		</Pressable>
	);
}

function Credits({ album }: { album: AlbumDetails }) {
	const trackCredits = getTrackOnlyCredits(album);
	if (album.credits.length === 0 && trackCredits.length === 0) return null;

	return (
		<View className="gap-6">
			{album.credits.length > 0 && (
				<View>
					<Text
						accessibilityRole="header"
						className="pb-1 text-base font-semibold text-foreground"
					>
						Credits
					</Text>
					{album.credits.map((credit) => (
						<CreditRow
							credit={credit}
							key={`${credit.partyId}-${credit.creditType}`}
						/>
					))}
				</View>
			)}
			{trackCredits.length > 0 && (
				<View>
					<Text
						accessibilityRole="header"
						className="pb-1 text-base font-semibold text-foreground"
					>
						Track credits
					</Text>
					{trackCredits.map((credit) => (
						<CreditRow
							credit={credit}
							key={`${credit.partyId}-${credit.creditType}`}
						/>
					))}
				</View>
			)}
		</View>
	);
}
