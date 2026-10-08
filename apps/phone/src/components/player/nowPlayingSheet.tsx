import { Image } from "expo-image";
import { Fragment, useEffect, useRef, useState } from "react";
import {
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";

import { DevicesSheet } from "@/components/player/devicesSheet";
import { PlaybackOptionsSheet } from "@/components/player/playbackOptionsSheet";
import { PlayerControls } from "@/components/player/playerControls";
import {
	PlayerLayerView,
	useLayerDragGesture,
} from "@/components/player/playerLayerView";
import { SeekBar } from "@/components/player/seekBar";
import { ToggleButton } from "@/components/player/toggleButton";
import { openTrackActions } from "@/components/tracks/trackActions";
import { Artwork } from "@/components/ui/artwork";
import { IconButton } from "@/components/ui/iconButton";
import { formatAudioFile } from "@/lib/format";
import { openPage } from "@/lib/navigation";
import { useArtworkUri } from "@/offline/offlineStore";
import { closePlayer, nowPlaying, queueLayer } from "@/player/nowPlaying";
import { usePlayerStore } from "@/player/playerStore";
import type { QueueEntry } from "@/player/track";

/** Now Playing, expanded from the mini player over the tabs; drag it down or press back to close it. */
export function NowPlayingSheet() {
	const open = nowPlaying.useStore((state) => state.open);
	const entry = usePlayerStore((state) => state.queue.at(state.index));
	// After the queue is cleared, the last track stays while the player slides away.
	const lastEntry = useRef(entry);
	if (entry) lastEntry.current = entry;
	const shown = entry ?? lastEntry.current;

	// Clearing the queue leaves nothing to show.
	useEffect(() => {
		if (open && !entry) closePlayer();
	}, [open, entry]);

	return (
		<PlayerLayerView layer={nowPlaying}>
			{shown && <NowPlaying entry={shown} />}
		</PlayerLayerView>
	);
}

function Header({ entry }: { entry: QueueEntry }) {
	return (
		<GestureDetector gesture={useLayerDragGesture(nowPlaying, "close")}>
			<View className="h-14 flex-row items-center px-2">
				<IconButton
					icon="chevronDown"
					label="Close Now Playing"
					onPress={() => nowPlaying.close()}
				/>
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
				<IconButton
					icon="more"
					label="More actions"
					onPress={() => openTrackActions({ track: entry, fromPlayer: true })}
				/>
			</View>
		</GestureDetector>
	);
}

function NowPlaying({ entry }: { entry: QueueEntry }) {
	const { width, height } = useWindowDimensions();
	const coverUri = useArtworkUri(entry.cover);
	const error = usePlayerStore((state) => state.error);
	const source = usePlayerStore((state) => state.source);
	// Leaves room for the details and controls on short screens.
	const coverSize = Math.min(width - 48, height * 0.42, 440);
	const closeGesture = useLayerDragGesture(nowPlaying, "close");

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
				<GestureDetector gesture={closeGesture}>
					<View>
						<Artwork
							accessibilityLabel={`${entry.albumTitle} cover`}
							className="rounded-3xl shadow-2xl"
							icon="musicNote"
							recyclingKey={entry.entryId}
							size={coverSize}
							uri={coverUri}
						/>
					</View>
				</GestureDetector>

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
				onPress={queueLayer.open}
			/>
			<PlaybackOptionsSheet
				onClose={() => setOptionsOpen(false)}
				open={optionsOpen}
			/>
			<DevicesSheet onClose={() => setDevicesOpen(false)} open={devicesOpen} />
		</View>
	);
}
