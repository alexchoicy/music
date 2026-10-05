import { Link } from "expo-router";
import { Alert, Text, View } from "react-native";
import ReorderableList, {
	useReorderableDrag,
} from "react-native-reorderable-list";
import { useShallow } from "zustand/react/shallow";

import { QueueRow } from "@/components/player/queueRow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";
import { formatTotalDuration } from "@/lib/duration";
import { getUpcomingIndices } from "@/lib/player/queue";
import type { QueueEntry } from "@/lib/player/track";
import { usePlayerStore } from "@/store/playerStore";

function SectionHeader({ title, detail }: { title: string; detail?: string }) {
	return (
		<View className="flex-row items-baseline justify-between gap-2 pt-4 pb-1">
			<Text
				accessibilityRole="header"
				className="text-sm font-semibold text-foreground"
			>
				{title}
			</Text>
			{detail && (
				<Text className="text-xs text-muted-foreground">{detail}</Text>
			)}
		</View>
	);
}

export default function QueueScreen() {
	const queue = usePlayerStore((state) => state.queue);
	const index = usePlayerStore((state) => state.index);
	// Recomputed only when the order changes, not on every status update.
	const upcoming = usePlayerStore(useShallow(getUpcomingIndices));
	const playQueueTrack = usePlayerStore((state) => state.playQueueTrack);
	const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
	const moveUpcoming = usePlayerStore((state) => state.moveUpcoming);
	const clearQueue = usePlayerStore((state) => state.clearQueue);
	const current = queue.at(index);

	const upcomingDuration = upcoming.reduce(
		(sum, i) => sum + (queue[i]?.durationInMs ?? 0),
		0,
	);

	function confirmClear() {
		Alert.alert("Clear queue?", "This stops playback and removes all tracks.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: clearQueue },
		]);
	}

	return (
		<Screen>
			<View className="min-h-14 flex-row items-center justify-between px-4 pt-3 pb-1">
				<Text
					accessibilityRole="header"
					className="text-xl font-semibold text-foreground"
				>
					Queue
				</Text>
				{queue.length > 0 && (
					<Button onPress={confirmClear} variant="ghost">
						Clear
					</Button>
				)}
			</View>
			{current ? (
				<ReorderableList
					// A third-party list, so padding is a style rather than a class.
					contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
					data={upcoming}
					keyExtractor={(i) => queue[i].entryId}
					onReorder={({ from, to }) => moveUpcoming(from, to)}
					ListEmptyComponent={
						<Text className="py-4 text-sm text-muted-foreground">
							Nothing after this track. Add albums or turn on Radio.
						</Text>
					}
					ListHeaderComponent={
						<>
							<SectionHeader title="Now playing" />
							<QueueRow
								entry={current}
								isCurrent
								onPress={() => playQueueTrack(index)}
								onRemove={() => removeFromQueue(index)}
							/>
							<SectionHeader
								detail={
									upcoming.length > 0
										? `${upcoming.length} ${upcoming.length === 1 ? "track" : "tracks"} · ${formatTotalDuration(upcomingDuration)}`
										: undefined
								}
								title="Next up"
							/>
						</>
					}
					renderItem={({ item, index: position }) => (
						<UpcomingRow
							entry={queue[item]}
							onMoveDown={
								position < upcoming.length - 1
									? () => moveUpcoming(position, position + 1)
									: undefined
							}
							onMoveUp={
								position > 0
									? () => moveUpcoming(position, position - 1)
									: undefined
							}
							onPress={() => playQueueTrack(item)}
							onRemove={() => removeFromQueue(item)}
						/>
					)}
				/>
			) : (
				<EmptyState
					action={
						<Link asChild href="/albums">
							<Button variant="outline">Browse albums</Button>
						</Link>
					}
					description="Play an album or add tracks to see them here."
					title="Queue is empty"
				/>
			)}
		</Screen>
	);
}

type UpcomingRowProps = {
	entry: QueueEntry;
	onPress: () => void;
	onRemove: () => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
};

/** A "Next up" row; the drag hook only works inside the reorderable list. */
function UpcomingRow(props: UpcomingRowProps) {
	const drag = useReorderableDrag();
	return <QueueRow {...props} onDragStart={drag} />;
}
