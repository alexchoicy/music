import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Text, useWindowDimensions, View } from "react-native";

import { PlaylistActions } from "@/components/playlists/playlistActions";
import { PlaylistCover } from "@/components/playlists/playlistCover";
import { openTrackActions } from "@/components/tracks/trackActions";
import { TrackRow } from "@/components/tracks/trackRow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { TopBar } from "@/components/ui/header";
import { IconButton } from "@/components/ui/iconButton";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { formatTotalDuration, plural } from "@/lib/format";
import { getEntryCover, usePlaylistAlbums } from "@/lib/playlist";
import type { PlaylistDetails } from "@/lib/schema";
import { useIsOnline, useOfflineStore } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { findPlayerTrack } from "@/player/track";
import { playlistQueries } from "@/queries/playlists";
import { useEndPadding } from "@/store/miniPlayerStore";

export default function PlaylistScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const playlist = useQuery(playlistQueries.detail(id));
	const [actionsOpen, setActionsOpen] = useState(false);

	return (
		<Screen>
			<TopBar
				actions={
					playlist.data && (
						<IconButton
							icon="more"
							label="Playlist actions"
							onPress={() => setActionsOpen(true)}
							size={48}
						/>
					)
				}
			/>
			{playlist.data ? (
				<Playlist
					onRefresh={() => void playlist.refetch()}
					playlist={playlist.data}
					refreshing={playlist.isRefetching}
				/>
			) : playlist.isPending ? (
				<Loading />
			) : (
				<EmptyState
					action={
						<Button
							loading={playlist.isFetching}
							onPress={() => void playlist.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="It may have been deleted, or the server can't be reached."
					icon="playlist"
					title="Couldn't load playlist"
				/>
			)}
			<PlaylistActions
				onClose={() => setActionsOpen(false)}
				onDeleted={() => router.back()}
				playlist={actionsOpen ? (playlist.data ?? null) : null}
			/>
		</Screen>
	);
}

type PlaylistProps = {
	playlist: PlaylistDetails;
	onRefresh: () => void;
	refreshing: boolean;
};

function Playlist({ playlist, onRefresh, refreshing }: PlaylistProps) {
	const { width } = useWindowDimensions();
	const albums = usePlaylistAlbums(playlist.entries);
	const isOnline = useIsOnline();
	const downloads = useOfflineStore((state) => state.tracks);
	const playTracks = usePlayerStore((state) => state.playTracks);
	const endPadding = useEndPadding(32);

	// Entries become playable once their album's details have loaded.
	const entries = playlist.entries.map((entry) => {
		const album = albums.get(String(entry.albumId));
		return {
			entry,
			track: album
				? findPlayerTrack(album, entry.albumDiscId, entry.trackId)
				: null,
		};
	});
	const playable = entries.flatMap(({ entry, track }) =>
		track && (isOnline || downloads[track.trackId]?.status === "downloaded")
			? [{ entry, track }]
			: [],
	);
	const playableTracks = playable.map((item) => item.track);
	const durationInMs = playlist.entries.reduce(
		(sum, entry) => sum + Number(entry.durationInMs),
		0,
	);

	return (
		<FlatList
			contentContainerClassName="px-4"
			contentContainerStyle={{ paddingBottom: endPadding }}
			data={entries}
			keyExtractor={({ entry }) => String(entry.entryId)}
			ListEmptyComponent={
				<EmptyState
					description="Add tracks from an album's track menu."
					icon="playlistAdd"
					title="This playlist is empty"
				/>
			}
			ListHeaderComponent={
				<View className="items-center gap-4 pb-6">
					<PlaylistCover
						entries={playlist.entries}
						size={Math.min(width * 0.6, 260)}
					/>
					<View className="items-center gap-1">
						<Text
							accessibilityRole="header"
							className="text-center text-2xl font-bold tracking-tight text-foreground"
						>
							{playlist.name}
						</Text>
						<Text className="text-sm text-muted-foreground">
							{plural(playlist.entries.length, "track")} ·{" "}
							{formatTotalDuration(durationInMs)}
						</Text>
					</View>
					<View className="w-full flex-row items-center justify-end gap-2">
						<IconButton
							disabled={playableTracks.length === 0}
							icon="shuffle"
							label="Shuffle playlist"
							onPress={() => playTracks(playableTracks, 0, { shuffle: true })}
							size={48}
							variant="surface"
						/>
						<IconButton
							disabled={playableTracks.length === 0}
							icon="play"
							iconSize={30}
							label="Play playlist"
							onPress={() => playTracks(playableTracks, 0, { shuffle: false })}
							size={60}
							variant="primary"
						/>
					</View>
				</View>
			}
			onRefresh={onRefresh}
			refreshing={refreshing}
			renderItem={({ item: { entry, track } }) => {
				const index = playable.findIndex((item) => item.entry === entry);
				return (
					<TrackRow
						cover={getEntryCover(entry, albums)}
						durationInMs={entry.durationInMs}
						hasAudio={!!track}
						onMore={
							track
								? () =>
										openTrackActions({
											track,
											playlist: { details: playlist, entry },
										})
								: undefined
						}
						onPlay={() => index >= 0 && playTracks(playableTracks, index)}
						subtitle={entry.albumTitle}
						title={entry.title}
						trackId={String(entry.trackId)}
					/>
				);
			}}
		/>
	);
}
