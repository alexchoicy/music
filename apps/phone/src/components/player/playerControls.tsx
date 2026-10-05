import { useAudioPlayerStatus } from "expo-audio";
import { ActivityIndicator, Pressable, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { audioPlayer } from "@/lib/player/engine";
import { usePlayerStore } from "@/store/playerStore";

type ControlButtonProps = {
	icon: IconName;
	label: string;
	onPress: () => void;
	/** Shown with a dot; undefined for plain buttons. */
	active?: boolean;
	/** Announced as an on/off switch; repeat has three modes, so it is a button. */
	isSwitch?: boolean;
	disabled?: boolean;
	/** Defaults to large for transport buttons and smaller for toggles. */
	size?: number;
};

export function ControlButton({
	icon,
	label,
	onPress,
	active,
	isSwitch = active !== undefined,
	disabled,
	size = active === undefined ? 30 : 24,
}: ControlButtonProps) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole={isSwitch ? "switch" : "button"}
			accessibilityState={{
				disabled: disabled ?? false,
				...(isSwitch && { checked: active }),
			}}
			className="size-12 items-center justify-center rounded-full active:opacity-60 disabled:opacity-40"
			disabled={disabled}
			onPress={onPress}
		>
			<Icon
				className={
					active === false ? "accent-muted-foreground" : "accent-foreground"
				}
				name={icon}
				size={size}
			/>
			{/* A dot marks an active toggle without relying on color alone. */}
			<View
				className={cn(
					"absolute bottom-1 size-1 rounded-full bg-foreground",
					!active && "opacity-0",
				)}
			/>
		</Pressable>
	);
}

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
			<ControlButton
				active={shuffle}
				icon={{ ios: "shuffle", android: "shuffle", web: "shuffle" }}
				label="Shuffle"
				onPress={toggleShuffle}
			/>
			<ControlButton
				disabled={!hasQueue}
				icon={{
					ios: "backward.end.fill",
					android: "skip_previous",
					web: "skip_previous",
				}}
				label="Previous"
				onPress={skipPrevious}
			/>
			<Pressable
				accessibilityLabel={isPlaying ? "Pause" : "Play"}
				accessibilityRole="button"
				accessibilityState={{ busy: isLoading, disabled: !hasQueue }}
				className="size-18 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
				disabled={!hasQueue}
				onPress={togglePlayback}
			>
				{isLoading ? (
					<ActivityIndicator colorClassName="accent-primary-foreground" />
				) : (
					<Icon
						className="accent-primary-foreground"
						name={
							isPlaying
								? { ios: "pause.fill", android: "pause", web: "pause" }
								: {
										ios: "play.fill",
										android: "play_arrow",
										web: "play_arrow",
									}
						}
						size={36}
					/>
				)}
			</Pressable>
			<ControlButton
				disabled={!hasQueue}
				icon={{
					ios: "forward.end.fill",
					android: "skip_next",
					web: "skip_next",
				}}
				label="Next"
				onPress={skipNext}
			/>
			<ControlButton
				active={repeatMode !== "off"}
				icon={
					repeatMode === "one"
						? { ios: "repeat.1", android: "repeat_one", web: "repeat_one" }
						: { ios: "repeat", android: "repeat", web: "repeat" }
				}
				isSwitch={false}
				label={`Repeat: ${repeatLabels[repeatMode]}`}
				onPress={cycleRepeatMode}
			/>
		</View>
	);
}
