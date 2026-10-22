import { Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { Segmented } from "@/components/ui/segmented";
import { RadioRow, Sheet, SheetSection } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switchRow";
import { formatTrackDuration, plural } from "@/lib/format";
import { usePlayerStore } from "@/player/playerStore";
import { getUpcomingIndices } from "@/player/queue";
import {
	qualityOptions,
	streamingQualityOptions,
	useSettingsStore,
} from "@/store/settingsStore";

// Long queues offer this many Stop after choices.
const maxStopOptions = 20;

/** Stop after choices: one per Music track from the current one, in play order. */
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
			<SheetSection label="Streaming quality">
				<Segmented
					label="Streaming quality"
					onChange={(value) => updateSettings({ streamingQuality: value })}
					options={streamingQualityOptions}
					value={streamingQuality}
				/>
				<Text className="text-xs leading-4 text-muted-foreground">
					Original is the uploaded file, such as FLAC. Efficient uses 96 kbps
					Opus when available. Auto streams Original on Wi‑Fi and Efficient on
					mobile data. Downloaded tracks play from the download.
				</Text>
			</SheetSection>

			<SheetSection label="Autoplay">
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
			</SheetSection>

			<SheetSection label="Stop after">
				<Text className="text-xs text-muted-foreground">
					{stopAfterMusicCount === null
						? "Only Music tracks count."
						: `${plural(stopAfterMusicCount, "music track")} left. Other tracks don't count.`}
				</Text>
				<View accessibilityLabel="Stop after" accessibilityRole="radiogroup">
					{[{ count: null, label: "Off" }, ...stopOptions].map((option) => (
						<RadioRow
							key={option.count ?? "off"}
							label={option.label}
							onPress={() => setStopAfterMusicCount(option.count)}
							selected={option.count === stopAfterMusicCount}
						/>
					))}
				</View>
			</SheetSection>
		</Sheet>
	);
}
