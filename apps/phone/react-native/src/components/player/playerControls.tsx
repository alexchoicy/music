import { useAudioPlayerStatus } from "expo-audio";
import { ActivityIndicator, Pressable, View } from "react-native";

import { ToggleButton } from "@/components/player/toggleButton";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { audioPlayer } from "@/player/engine";
import { usePlayerStore } from "@/player/playerStore";

const repeatLabels = { off: "off", all: "queue", one: "track" };

export function PlayerControls() {
	const { isBuffering } = useAudioPlayerStatus(audioPlayer);
	const status = usePlayerStore((state) => state.status);
	const hasQueue = usePlayerStore((state) => state.queue.length > 0);
	const shuffle = usePlayerStore((state) => state.shuffle);
	const repeatMode = usePlayerStore((state) => state.repeatMode);
	const togglePlayback = usePlayerStore((state) => state.togglePlayback);
	const skipNext = usePlayerStore((state) => state.skipNext);
	const skipPrevious = usePlayerStore((state) => state.skipPrevious);
	const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
	const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode);

	const isPlaying = status === "playing";
	const isLoading = status === "loading" || (isPlaying && isBuffering);

	return (
		<View className="flex-row items-center justify-between">
			<ToggleButton
				active={shuffle}
				icon="shuffle"
				label="Shuffle"
				onPress={toggleShuffle}
			/>
			<IconButton
				disabled={!hasQueue}
				icon="skipPrevious"
				iconSize={34}
				label="Previous"
				onPress={skipPrevious}
				size={56}
			/>
			<Pressable
				accessibilityLabel={isPlaying ? "Pause" : "Play"}
				accessibilityRole="button"
				accessibilityState={{ busy: isLoading, disabled: !hasQueue }}
				className="size-20 items-center justify-center rounded-full bg-primary active:scale-95 active:opacity-90 disabled:opacity-40"
				disabled={!hasQueue}
				onPress={togglePlayback}
			>
				{isLoading ? (
					<ActivityIndicator
						colorClassName="accent-primary-foreground"
						size="large"
					/>
				) : (
					<Icon
						className="accent-primary-foreground"
						name={isPlaying ? "pause" : "play"}
						size={40}
					/>
				)}
			</Pressable>
			<IconButton
				disabled={!hasQueue}
				icon="skipNext"
				iconSize={34}
				label="Next"
				onPress={skipNext}
				size={56}
			/>
			<ToggleButton
				active={repeatMode !== "off"}
				icon={repeatMode === "one" ? "repeatOne" : "repeat"}
				label={`Repeat: ${repeatLabels[repeatMode]}`}
				onPress={cycleRepeatMode}
				role="button"
			/>
		</View>
	);
}
