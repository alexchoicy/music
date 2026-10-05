import { Image } from "expo-image";
import { Link } from "expo-router";
import { Fragment, useState } from "react";
import {
	ScrollView,
	Share,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

import { PlaybackOptionsSheet } from "@/components/player/playbackOptionsSheet";
import {
	ControlButton,
	PlayerControls,
} from "@/components/player/playerControls";
import { SeekBar } from "@/components/player/seekBar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { useClearTabHistory } from "@/lib/navigation";
import { useArtworkUri } from "@/lib/offline/media";
import { formatAudioFile } from "@/lib/player/format";
import type { QueueEntry } from "@/lib/player/track";
import { usePlayerStore } from "@/store/playerStore";

export default function PlayingScreen() {
	const entry = usePlayerStore((state) => state.queue.at(state.index));

	return (
		<Screen>
			{entry ? (
				<NowPlaying entry={entry} />
			) : (
				<EmptyState
					action={
						<Link asChild href="/albums">
							<Button variant="outline">Browse albums</Button>
						</Link>
					}
					description="Pick something from your library to start listening."
					title="Nothing playing"
				/>
			)}
		</Screen>
	);
}

function NowPlaying({ entry }: { entry: QueueEntry }) {
	const { width, height } = useWindowDimensions();
	const coverUrl = useArtworkUri(entry.cover);
	const error = usePlayerStore((state) => state.error);
	const source = usePlayerStore((state) => state.source);
	const clearTabHistory = useClearTabHistory();
	// Leave room for the track details and controls on short screens.
	const coverSize = Math.min(width - 48, height * 0.42, 420);

	return (
		<ScrollView contentContainerClassName="flex-grow items-center justify-center gap-6 px-6 py-6">
			<View
				className="overflow-hidden rounded-xl bg-muted"
				style={{ width: coverSize, height: coverSize }}
			>
				{coverUrl ? (
					<Image
						accessibilityIgnoresInvertColors
						contentFit="cover"
						recyclingKey={entry.entryId}
						source={coverUrl}
						style={{ width: "100%", height: "100%" }}
						transition={150}
					/>
				) : (
					<View className="flex-1 items-center justify-center">
						<Icon
							className="accent-muted-foreground"
							name={{
								ios: "music.note",
								android: "music_note",
								web: "music_note",
							}}
							size={48}
						/>
					</View>
				)}
			</View>

			<View className="w-full max-w-md gap-5">
				<View className="gap-1">
					<Text
						accessibilityRole="header"
						className="text-xl font-semibold text-foreground"
						numberOfLines={2}
					>
						{entry.title}
					</Text>
					<Text className="text-sm text-muted-foreground" numberOfLines={2}>
						{entry.artists.length > 0
							? entry.artists.map((artist, index) => (
									<Fragment key={artist.partyId}>
										{index > 0 && ", "}
										<Link
											className="font-medium text-foreground"
											href={{
												pathname: "/parties/[id]",
												params: { id: artist.partyId },
											}}
											onPress={(event) => clearTabHistory("parties", event)}
											push
											suppressHighlighting={false}
											withAnchor
										>
											{artist.name}
										</Link>
									</Fragment>
								))
							: "Unknown artist"}
					</Text>
					<Link
						className="self-start text-sm text-muted-foreground"
						href={{ pathname: "/albums/[id]", params: { id: entry.albumId } }}
						numberOfLines={1}
						onPress={(event) => clearTabHistory("albums", event)}
						push
						suppressHighlighting={false}
						withAnchor
					>
						{entry.albumTitle}
					</Link>
				</View>

				<View className="gap-1">
					<SeekBar durationInMs={entry.durationInMs} />
					{source && (
						<Text
							className="text-center text-xs text-muted-foreground"
							numberOfLines={1}
						>
							{formatAudioFile(
								source.file,
								source.file.id === entry.audio.file.opus96?.id,
							)}
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

				<SecondaryControls entry={entry} />
			</View>
		</ScrollView>
	);
}

function SecondaryControls({ entry }: { entry: QueueEntry }) {
	const radio = usePlayerStore((state) => state.radio);
	const toggleRadio = usePlayerStore((state) => state.toggleRadio);
	const stopAfterMusicCount = usePlayerStore(
		(state) => state.stopAfterMusicCount,
	);
	const [optionsOpen, setOptionsOpen] = useState(false);
	const artists = entry.artists.map((artist) => artist.name).join(", ");

	return (
		<View className="flex-row items-center justify-between">
			<ControlButton
				active={radio}
				icon={{
					ios: "dot.radiowaves.left.and.right",
					android: "radio",
					web: "radio",
				}}
				label="Radio, plays similar music when the queue ends"
				onPress={toggleRadio}
			/>
			<View className="flex-row items-center">
				<ControlButton
					icon={{ ios: "square.and.arrow.up", android: "share", web: "share" }}
					label="Share track"
					onPress={() =>
						void Share.share({
							message: `${entry.title}${artists ? ` – ${artists}` : ""} (${entry.albumTitle})`,
						})
					}
					size={24}
				/>
				<ControlButton
					// Marks an active "stop after" timer, like a toggle.
					active={stopAfterMusicCount !== null || undefined}
					icon={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
					isSwitch={false}
					label={
						stopAfterMusicCount === null
							? "Playback options"
							: `Playback options, stops after ${stopAfterMusicCount} music ${stopAfterMusicCount === 1 ? "track" : "tracks"}`
					}
					onPress={() => setOptionsOpen(true)}
					size={24}
				/>
			</View>
			<PlaybackOptionsSheet
				onClose={() => setOptionsOpen(false)}
				open={optionsOpen}
			/>
		</View>
	);
}
