import Slider from "@react-native-community/slider";
import { useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import { Text, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { formatTrackDuration } from "@/lib/format";
import { audioPlayer } from "@/player/engine";
import { usePlayerStore } from "@/player/playerStore";

type SeekBarProps = {
	/** Used until the player knows the file's duration. */
	durationInMs: number;
};

export function SeekBar({ durationInMs }: SeekBarProps) {
	const status = useAudioPlayerStatus(audioPlayer);
	const isLoaded = usePlayerStore(
		(state) => state.status === "playing" || state.status === "paused",
	);
	const seekTo = usePlayerStore((state) => state.seekTo);
	// The position while dragging, so playback updates do not fight the finger.
	const [dragging, setDragging] = useState<number | null>(null);
	const foreground = useCSSVariable("--color-foreground");
	const track = useCSSVariable("--color-surface-strong");

	const duration =
		isLoaded && status.duration > 0 ? status.duration : durationInMs / 1000;
	const position = dragging ?? (isLoaded ? status.currentTime : 0);

	return (
		<View>
			<Slider
				accessibilityLabel="Seek"
				accessibilityValue={{
					text: `${formatTrackDuration(position * 1000)} of ${formatTrackDuration(duration * 1000)}`,
				}}
				disabled={!isLoaded}
				maximumTrackTintColor={String(track)}
				maximumValue={Math.max(duration, 1)}
				minimumTrackTintColor={String(foreground)}
				minimumValue={0}
				onSlidingComplete={(value) => {
					seekTo(value);
					setDragging(null);
				}}
				onSlidingStart={setDragging}
				onValueChange={(value) => {
					if (dragging !== null) setDragging(value);
				}}
				step={0}
				style={{ height: 36, marginHorizontal: -12 }}
				thumbTintColor={String(foreground)}
				value={Math.min(position, duration)}
			/>
			<View className="flex-row justify-between">
				<Text className="text-xs font-medium text-muted-foreground tabular-nums">
					{formatTrackDuration(position * 1000)}
				</Text>
				<Text className="text-xs font-medium text-muted-foreground tabular-nums">
					-{formatTrackDuration(Math.max(duration - position, 0) * 1000)}
				</Text>
			</View>
		</View>
	);
}
