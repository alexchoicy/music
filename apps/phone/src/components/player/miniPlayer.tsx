import { useAudioPlayerStatus } from "expo-audio";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { IconButton } from "@/components/ui/iconButton";
import { useArtworkUri } from "@/offline/offlineStore";
import { audioPlayer } from "@/player/engine";
import { usePlayerStore } from "@/player/playerStore";
import type { QueueEntry } from "@/player/track";

/** The track playing now, docked above the tabs; tapping it opens Now Playing. */
export function MiniPlayer() {
	const entry = usePlayerStore((state) => state.queue.at(state.index));
	if (!entry) return null;
	return <Bar entry={entry} />;
}

function Bar({ entry }: { entry: QueueEntry }) {
	const coverUri = useArtworkUri(entry.cover);
	const status = usePlayerStore((state) => state.status);
	const togglePlayback = usePlayerStore((state) => state.togglePlayback);
	const skipNext = usePlayerStore((state) => state.skipNext);
	const artists =
		entry.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	return (
		<View className="mx-2 mb-2 overflow-hidden rounded-2xl bg-surface-strong shadow-lg">
			<View className="flex-row items-center gap-1 pr-1">
				<Link asChild href="/player">
					<Pressable
						accessibilityHint="Opens Now Playing"
						accessibilityLabel={`${entry.title}, ${artists}`}
						accessibilityRole="button"
						className="flex-1 flex-row items-center gap-3 p-2 active:opacity-70"
					>
						<Artwork
							icon="musicNote"
							recyclingKey={entry.entryId}
							size={44}
							uri={coverUri}
						/>
						<View className="flex-1">
							<Text
								className="text-sm font-semibold text-foreground"
								numberOfLines={1}
							>
								{entry.title}
							</Text>
							<Text className="text-xs text-muted-foreground" numberOfLines={1}>
								{artists}
							</Text>
						</View>
					</Pressable>
				</Link>
				{status === "loading" ? (
					<View className="size-11 items-center justify-center">
						<ActivityIndicator colorClassName="accent-foreground" />
					</View>
				) : (
					<IconButton
						icon={status === "playing" ? "pause" : "play"}
						iconSize={26}
						label={status === "playing" ? "Pause" : "Play"}
						onPress={togglePlayback}
					/>
				)}
				<IconButton
					icon="skipNext"
					iconSize={24}
					label="Next"
					onPress={skipNext}
				/>
			</View>
			<Progress durationInMs={entry.durationInMs} />
		</View>
	);
}

/** A thin progress line; its own component so status updates only redraw it. */
function Progress({ durationInMs }: { durationInMs: number }) {
	const { currentTime, duration } = useAudioPlayerStatus(audioPlayer);
	const isLoaded = usePlayerStore(
		(state) => state.status === "playing" || state.status === "paused",
	);
	const total = duration > 0 ? duration : durationInMs / 1000;
	const fraction = isLoaded && total > 0 ? Math.min(currentTime / total, 1) : 0;

	return (
		<View className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-surface-strong">
			<View
				className="h-full rounded-full bg-foreground"
				style={{ width: `${fraction * 100}%` }}
			/>
		</View>
	);
}
