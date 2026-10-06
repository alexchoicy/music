import { Image } from "expo-image";
import { router } from "expo-router";
import { Fragment, useState } from "react";
import {
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DevicesSheet } from "@/components/player/devicesSheet";
import { PlaybackOptionsSheet } from "@/components/player/playbackOptionsSheet";
import { PlayerControls } from "@/components/player/playerControls";
import { SeekBar } from "@/components/player/seekBar";
import { ToggleButton } from "@/components/player/toggleButton";
import { openTrackActions } from "@/components/tracks/trackActions";
import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { IconButton } from "@/components/ui/iconButton";
import { formatAudioFile } from "@/lib/format";
import { openPage } from "@/lib/navigation";
import { useArtworkUri } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import type { QueueEntry } from "@/player/track";

export default function PlayerScreen() {
	const entry = usePlayerStore((state) => state.queue.at(state.index));
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingTop: insets.top,
				paddingBottom: insets.bottom,
				paddingLeft: insets.left,
				paddingRight: insets.right,
			}}
		>
			{entry ? (
				<NowPlaying entry={entry} />
			) : (
				<>
					<Header />
					<EmptyState
						action={
							<Button onPress={() => router.back()} variant="secondary">
								Back to library
							</Button>
						}
						description="Pick something from your library to start listening."
						icon="musicNote"
						title="Nothing playing"
					/>
				</>
			)}
		</View>
	);
}

function Header({ entry }: { entry?: QueueEntry }) {
	return (
		<View className="h-14 flex-row items-center px-2">
			<IconButton
				icon="chevronDown"
				label="Close Now Playing"
				onPress={() => router.back()}
			/>
			{entry ? (
				<Pressable
					accessibilityHint="Opens the album"
					accessibilityLabel={`Playing from ${entry.albumTitle}`}
					accessibilityRole="link"
					className="flex-1 items-center px-2 active:opacity-60"
					onPress={() => openPage("album", entry.albumId, true)}
				>
					<Text className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
						Playing from
					</Text>
					<Text
						className="text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{entry.albumTitle}
					</Text>
				</Pressable>
			) : (
				<View className="flex-1" />
			)}
			{entry ? (
				<IconButton
					icon="more"
					label="More actions"
					onPress={() => openTrackActions({ track: entry, fromPlayer: true })}
				/>
			) : (
				<View className="size-11" />
			)}
		</View>
	);
}

function NowPlaying({ entry }: { entry: QueueEntry }) {
	const { width, height } = useWindowDimensions();
	const coverUri = useArtworkUri(entry.cover);
	const error = usePlayerStore((state) => state.error);
	const source = usePlayerStore((state) => state.source);
	// Leaves room for the details and controls on short screens.
	const coverSize = Math.min(width - 48, height * 0.42, 440);

	return (
		<>
			{coverUri && (
				<View style={StyleSheet.absoluteFill}>
					<Image
						blurRadius={70}
						recyclingKey={entry.entryId}
						source={coverUri}
						style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
					/>
					<View className="absolute inset-0 bg-background opacity-60" />
				</View>
			)}
			<Header entry={entry} />
			<ScrollView contentContainerClassName="grow items-center justify-center gap-7 px-6 pb-4">
				<Artwork
					accessibilityLabel={`${entry.albumTitle} cover`}
					className="rounded-3xl shadow-2xl"
					icon="musicNote"
					recyclingKey={entry.entryId}
					size={coverSize}
					uri={coverUri}
				/>

				<View className="w-full max-w-md gap-5">
					<View className="gap-1">
						<Text
							accessibilityRole="header"
							className="text-2xl font-bold tracking-tight text-foreground"
							numberOfLines={2}
						>
							{entry.title}
						</Text>
						<Text className="text-base text-muted-foreground" numberOfLines={2}>
							{entry.artists.length > 0
								? entry.artists.map((artist, index) => (
										<Fragment key={artist.partyId}>
											{index > 0 && ", "}
											<Text
												accessibilityRole="link"
												className="font-medium text-foreground"
												onPress={() => openPage("party", artist.partyId, true)}
												suppressHighlighting={false}
											>
												{artist.name}
											</Text>
										</Fragment>
									))
								: "Unknown artist"}
						</Text>
					</View>

					<View className="gap-1">
						<SeekBar durationInMs={entry.durationInMs} />
						{source && (
							<Text
								className="text-center text-xs font-medium text-muted-foreground"
								numberOfLines={1}
							>
								{formatAudioFile(source.file)}
								{source.isLocal ? " · Downloaded" : ""}
							</Text>
						)}
					</View>

					<PlayerControls />

					{error && (
						<Text
							accessibilityLiveRegion="polite"
							className="text-center text-sm text-destructive"
						>
							Couldn't play this track. Tap play to try again.
						</Text>
					)}

					<BottomActions entry={entry} />
				</View>
			</ScrollView>
		</>
	);
}

function BottomActions({ entry }: { entry: QueueEntry }) {
	const radio = usePlayerStore((state) => state.radio);
	const toggleRadio = usePlayerStore((state) => state.toggleRadio);
	const stopAfterMusicCount = usePlayerStore(
		(state) => state.stopAfterMusicCount,
	);
	const [optionsOpen, setOptionsOpen] = useState(false);
	const [devicesOpen, setDevicesOpen] = useState(false);
	const artists = entry.artists.map((artist) => artist.name).join(", ");

	return (
		<View className="flex-row items-center justify-between">
			<ToggleButton
				active={radio}
				icon="radio"
				label="Radio, plays similar music when the queue ends"
				onPress={toggleRadio}
			/>
			<IconButton
				icon="share"
				iconSize={22}
				label="Share track"
				onPress={() =>
					void Share.share({
						message: `${entry.title}${artists ? ` – ${artists}` : ""} (${entry.albumTitle})`,
					})
				}
			/>
			<IconButton
				icon="devices"
				iconSize={22}
				label="Devices"
				onPress={() => setDevicesOpen(true)}
			/>
			<ToggleButton
				// Marks a running Stop after timer.
				active={stopAfterMusicCount !== null}
				icon="options"
				label={
					stopAfterMusicCount === null
						? "Playback options"
						: `Playback options, stops after ${stopAfterMusicCount} music ${stopAfterMusicCount === 1 ? "track" : "tracks"}`
				}
				onPress={() => setOptionsOpen(true)}
				role="button"
			/>
			<IconButton
				icon="queue"
				iconSize={22}
				label="Queue"
				onPress={() => router.push("/queue")}
			/>
			<PlaybackOptionsSheet
				onClose={() => setOptionsOpen(false)}
				open={optionsOpen}
			/>
			<DevicesSheet onClose={() => setDevicesOpen(false)} open={devicesOpen} />
		</View>
	);
}
