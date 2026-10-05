import { Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switchRow";
import { cn } from "@/lib/cn";
import { formatTrackDuration } from "@/lib/duration";
import { getUpcomingIndices } from "@/lib/player/queue";
import { usePlayerStore } from "@/store/playerStore";
import type { AudioQuality } from "@/store/settingsStore";
import { useSettingsStore } from "@/store/settingsStore";

const qualityOptions: { label: string; value: AudioQuality }[] = [
	{ label: "Original", value: "original" },
	{ label: "Efficient", value: "efficient" },
];

// Long queues offer this many "stop after" choices.
const maxStopOptions = 20;

/** "Stop after" choices: one per Music track from the current one, in play order. */
function useStopAfterOptions() {
	const queue = usePlayerStore((state) => state.queue);
	const index = usePlayerStore((state) => state.index);
	const upcoming = usePlayerStore(useShallow(getUpcomingIndices));
	let durationInMs = 0;
	let count = 0;
	const options: { count: number; label: string }[] = [];
	for (const i of [index, ...upcoming]) {
		const entry = queue.at(i);
		if (!entry || options.length >= maxStopOptions) break;
		durationInMs += entry.durationInMs;
		if (entry.contentType !== "Music") continue;
		count += 1;
		options.push({
			count,
			label: `${count === 1 && i === index ? "After this track" : `After ${count} music tracks`} (${formatTrackDuration(durationInMs)})`,
		});
	}
	return options;
}

type PlaybackOptionsSheetProps = {
	open: boolean;
	onClose: () => void;
};

export function PlaybackOptionsSheet({
	open,
	onClose,
}: PlaybackOptionsSheetProps) {
	const streamingQuality = useSettingsStore((state) => state.streamingQuality);
	const updateSettings = useSettingsStore((state) => state.update);
	const playTalkTrack = usePlayerStore((state) => state.playTalkTrack);
	const playInstrumental = usePlayerStore((state) => state.playInstrumental);
	const stopAfterMusicCount = usePlayerStore(
		(state) => state.stopAfterMusicCount,
	);
	const setPlayTalkTrack = usePlayerStore((state) => state.setPlayTalkTrack);
	const setPlayInstrumental = usePlayerStore(
		(state) => state.setPlayInstrumental,
	);
	const setStopAfterMusicCount = usePlayerStore(
		(state) => state.setStopAfterMusicCount,
	);
	const stopOptions = useStopAfterOptions();

	return (
		<Sheet onClose={onClose} open={open} title="Playback">
			<View
				accessibilityLabel="Streaming quality"
				accessibilityRole="radiogroup"
				className="gap-2"
			>
				<Text className="text-sm font-medium text-foreground">
					Streaming quality
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{qualityOptions.map((option) => (
						<Chip
							key={option.value}
							label={option.label}
							onPress={() => updateSettings({ streamingQuality: option.value })}
							role="radio"
							selected={option.value === streamingQuality}
						/>
					))}
				</View>
				<Text className="text-xs text-muted-foreground">
					Original is the uploaded file, such as FLAC. Efficient uses 96 kbps
					Opus when available. Downloaded tracks play from the download.
				</Text>
			</View>

			<SwitchRow
				description="Include Talk tracks when playback moves on by itself."
				label="Play Talk tracks"
				onChange={setPlayTalkTrack}
				value={playTalkTrack}
			/>
			<SwitchRow
				description="Include Instrumental tracks when playback moves on by itself."
				label="Play Instrumental tracks"
				onChange={setPlayInstrumental}
				value={playInstrumental}
			/>

			<View
				accessibilityLabel="Stop after"
				accessibilityRole="radiogroup"
				className="gap-1"
			>
				<Text className="text-sm font-medium text-foreground">Stop after</Text>
				<Text className="pb-1 text-xs text-muted-foreground">
					{stopAfterMusicCount === null
						? "Only Music tracks count."
						: `${stopAfterMusicCount} music ${stopAfterMusicCount === 1 ? "track" : "tracks"} left. Other tracks don't count.`}
				</Text>
				{[{ count: null, label: "Off" }, ...stopOptions].map((option) => {
					const selected = option.count === stopAfterMusicCount;
					return (
						<Pressable
							accessibilityRole="radio"
							accessibilityState={{ checked: selected }}
							className="min-h-11 flex-row items-center gap-3 active:opacity-70"
							key={option.count ?? "off"}
							onPress={() => setStopAfterMusicCount(option.count)}
						>
							<View
								className={cn(
									"size-5 items-center justify-center rounded-full border-2",
									selected ? "border-primary" : "border-muted-foreground",
								)}
							>
								{selected && (
									<View className="size-2.5 rounded-full bg-primary" />
								)}
							</View>
							<Text className="flex-1 text-sm text-foreground">
								{option.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</Sheet>
	);
}
