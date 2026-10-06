import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import {
	RefreshControl,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

import { AlbumDownloadButton } from "@/components/albums/albumDownloadButton";
import { openTrackActions } from "@/components/tracks/trackActions";
import { TrackRow } from "@/components/tracks/trackRow";
import { Artwork } from "@/components/ui/artwork";
import { Backdrop } from "@/components/ui/backdrop";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { SectionHeader, TopBar } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { ListRow } from "@/components/ui/listRow";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { formatReleaseYear, formatTotalDuration, plural } from "@/lib/format";
import {
	getAvatar,
	getCover,
	getTrackBadges,
	getTrackOnlyCredits,
	joinNames,
} from "@/lib/music";
import type { AlbumCredit, AlbumDetails } from "@/lib/schema";
import {
	useArtworkUri,
	useIsOnline,
	useOfflineStore,
} from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import type { PlayerTrack } from "@/player/track";
import { toPlayerTracks } from "@/player/track";
import { albumQueries } from "@/queries/albums";
import { useEndPadding } from "@/store/miniPlayerStore";

export default function AlbumScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const album = useQuery(albumQueries.detail(id));
	const endPadding = useEndPadding(32);

	return (
		<Screen>
			{album.data && <AlbumBackdrop album={album.data} />}
			<TopBar />
			{album.data ? (
				<ScrollView
					contentContainerClassName="gap-8 px-4"
					contentContainerStyle={{ paddingBottom: endPadding }}
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
				</ScrollView>
			) : album.isPending ? (
				<Loading />
			) : (
				<EmptyState
					action={
						<Button
							loading={album.isFetching}
							onPress={() => void album.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="It may have been removed, or the server can't be reached."
					icon="album"
					title="Couldn't load album"
				/>
			)}
		</Screen>
	);
}

function AlbumBackdrop({ album }: { album: AlbumDetails }) {
	const { width } = useWindowDimensions();
	const coverUri = useArtworkUri(getCover(album.cover.album));
	return <Backdrop height={Math.min(width, 480)} uri={coverUri} />;
}

function AlbumContent({ album }: { album: AlbumDetails }) {
	const isOnline = useIsOnline();
	const downloads = useOfflineStore((state) => state.tracks);
	// The tracks that can play now: all of them online, downloads offline.
	const tracks = toPlayerTracks(album).filter(
		(track) => isOnline || downloads[track.trackId]?.status === "downloaded",
	);

	return (
		<>
			<Hero album={album} tracks={tracks} />
			<TrackList album={album} tracks={tracks} />
			<Credits album={album} />
		</>
	);
}

type AlbumTracksProps = {
	album: AlbumDetails;
	/** The tracks that can play now, in album order. */
	tracks: PlayerTrack[];
};

function Hero({ album, tracks }: AlbumTracksProps) {
	const { width } = useWindowDimensions();
	const coverSize = Math.min(width * 0.7, 300);
	const coverUri = useArtworkUri(getCover(album.cover.album));
	const albumId = String(album.albumId);
	const isCurrentAlbum = usePlayerStore(
		(state) => state.queue.at(state.index)?.albumId === albumId,
	);
	const isPlaying = usePlayerStore(
		(state) => state.status === "playing" || state.status === "loading",
	);
	const playTracks = usePlayerStore((state) => state.playTracks);
	const togglePlayback = usePlayerStore((state) => state.togglePlayback);
	const isPlayingAlbum = isCurrentAlbum && isPlaying;
	const meta = [
		album.type,
		formatReleaseYear(album.releaseDate),
		plural(album.totalTrackCount, "track"),
		formatTotalDuration(album.totalDurationInMs),
	].filter(Boolean);

	return (
		<View className="items-center gap-5">
			<Artwork
				accessibilityLabel={`${album.title} cover`}
				className="shadow-xl"
				size={coverSize}
				uri={coverUri}
			/>
			<View className="w-full items-center gap-1.5">
				<Text
					accessibilityRole="header"
					className="text-center text-2xl font-bold tracking-tight text-foreground"
				>
					{album.title}
				</Text>
				<Text className="text-center text-base text-muted-foreground">
					{album.credits.length > 0
						? album.credits.map((credit, index) => (
								<Fragment key={`${credit.partyId}-${credit.creditType}`}>
									{index > 0 && ", "}
									<Link
										className="font-semibold text-foreground"
										href={{
											pathname: "/party/[id]",
											params: { id: String(credit.partyId) },
										}}
										push
										suppressHighlighting={false}
									>
										{credit.name}
									</Link>
								</Fragment>
							))
						: "Unknown artist"}
				</Text>
				<Text className="text-center text-sm text-muted-foreground">
					{meta.join(" · ")}
				</Text>
			</View>
			<View className="w-full flex-row items-center gap-2">
				<AlbumDownloadButton album={album} />
				<View className="flex-1" />
				<IconButton
					disabled={tracks.length === 0}
					icon="shuffle"
					label="Shuffle album"
					onPress={() => playTracks(tracks, 0, { shuffle: true })}
					size={48}
					variant="surface"
				/>
				<IconButton
					disabled={tracks.length === 0}
					icon={isPlayingAlbum ? "pause" : "play"}
					iconSize={30}
					label={isPlayingAlbum ? "Pause" : "Play album"}
					onPress={() =>
						isCurrentAlbum
							? togglePlayback()
							: playTracks(tracks, 0, { shuffle: false })
					}
					size={60}
					variant="primary"
				/>
			</View>
		</View>
	);
}

function TrackList({ album, tracks }: AlbumTracksProps) {
	const playTracks = usePlayerStore((state) => state.playTracks);

	if (!album.discs.some((disc) => disc.tracks.length > 0)) {
		return (
			<Text className="text-center text-sm text-muted-foreground">
				This album has no tracks yet.
			</Text>
		);
	}

	return (
		<View className="gap-6">
			{album.discs.map((disc) => (
				<View key={disc.albumDiscId}>
					{album.discs.length > 1 && (
						<View className="flex-row items-center gap-2 pb-1">
							<Icon
								className="accent-muted-foreground"
								name="album"
								size={16}
							/>
							<Text
								accessibilityRole="header"
								className="flex-1 text-sm font-semibold text-muted-foreground"
								numberOfLines={1}
							>
								Disc {disc.discNumber}
								{disc.subtitle ? ` · ${disc.subtitle}` : ""}
							</Text>
						</View>
					)}
					{disc.tracks.map((track) => {
						const trackId = String(track.trackId);
						const playerTrack = tracks.find((item) => item.trackId === trackId);
						return (
							<TrackRow
								badges={getTrackBadges(track)}
								durationInMs={track.durationInMs}
								hasAudio={track.audios.length > 0}
								key={trackId}
								number={String(track.trackNumber)}
								onMore={
									playerTrack &&
									(() =>
										openTrackActions({ track: playerTrack, onAlbumPage: true }))
								}
								onPlay={() =>
									playerTrack && playTracks(tracks, tracks.indexOf(playerTrack))
								}
								subtitle={joinNames(track.credits) || undefined}
								title={track.title}
								trackId={trackId}
							/>
						);
					})}
				</View>
			))}
		</View>
	);
}

function Credits({ album }: { album: AlbumDetails }) {
	const trackCredits = getTrackOnlyCredits(album);
	const sections = [
		{ title: "Credits", credits: album.credits },
		{ title: "Track credits", credits: trackCredits },
	].filter((section) => section.credits.length > 0);

	return sections.map((section) => (
		<View key={section.title}>
			<SectionHeader title={section.title} />
			{section.credits.map((credit) => (
				<CreditRow
					credit={credit}
					key={`${credit.partyId}-${credit.creditType}`}
				/>
			))}
		</View>
	));
}

function CreditRow({ credit }: { credit: AlbumCredit }) {
	const avatarUri = useArtworkUri(getAvatar(credit.avatar));

	return (
		<Link
			asChild
			href={{ pathname: "/party/[id]", params: { id: String(credit.partyId) } }}
			push
		>
			<ListRow
				accessibilityLabel={`${credit.name}, ${credit.creditType}`}
				accessibilityRole="link"
				leading={
					<Artwork icon="person" shape="circle" size={44} uri={avatarUri} />
				}
				subtitle={credit.creditType}
				title={credit.name}
				trailing={
					<Icon
						className="accent-muted-foreground"
						name="chevronRight"
						size={18}
					/>
				}
			/>
		</Link>
	);
}
