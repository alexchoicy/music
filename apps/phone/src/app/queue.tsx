import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import ReorderableList, {
	useReorderableDrag,
} from "react-native-reorderable-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

import { QueueRow } from "@/components/player/queueRow";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirmDialog";
import { EmptyState } from "@/components/ui/emptyState";
import { SectionHeader, TopBar } from "@/components/ui/header";
import { formatTotalDuration, plural } from "@/lib/format";
import { usePlayerStore } from "@/player/playerStore";
import { getUpcomingIndices } from "@/player/queue";

export default function QueueScreen() {
	const insets = useSafeAreaInsets();
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
		confirm({
			title: "Clear queue?",
			message: "This stops playback and removes all tracks.",
			confirmLabel: "Clear",
			icon: "queue",
			onConfirm: clearQueue,
		});
	}

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingTop: insets.top,
				paddingLeft: insets.left,
				paddingRight: insets.right,
			}}
		>
			<TopBar
				actions={
					queue.length > 0 && (
						<Button
							className="h-10 px-3"
							onPress={confirmClear}
							variant="ghost"
						>
							Clear
						</Button>
					)
				}
				leading="close"
				title="Queue"
			/>
			{current ? (
				<ReorderableList
					// A third-party list, so padding is a style rather than a class.
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingBottom: insets.bottom + 16,
					}}
					data={upcoming}
					keyExtractor={(i) => queue[i].entryId}
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
							<View className="pt-4">
								<SectionHeader
									detail={
										upcoming.length > 0
											? `${plural(upcoming.length, "track")} · ${formatTotalDuration(upcomingDuration)}`
											: undefined
									}
									title="Next up"
								/>
							</View>
						</>
					}
					onReorder={({ from, to }) => moveUpcoming(from, to)}
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
						<Button onPress={() => router.dismissAll()} variant="secondary">
							Back to library
						</Button>
					}
					description="Play an album or add tracks to see them here."
					icon="queue"
					title="Queue is empty"
				/>
			)}
		</View>
	);
}

type UpcomingRowProps = Omit<
	ComponentProps<typeof QueueRow>,
	"isCurrent" | "onDragStart"
>;

/** A Next up row; the drag hook only works inside the reorderable list. */
function UpcomingRow(props: UpcomingRowProps) {
	const drag = useReorderableDrag();
	return <QueueRow {...props} onDragStart={drag} />;
}
