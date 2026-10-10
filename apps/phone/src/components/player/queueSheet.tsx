import type { ComponentProps } from "react";
import { useRef } from "react";
import type { FlatList } from "react-native";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import ReorderableList, {
	useReorderableDrag,
} from "react-native-reorderable-list";
import { useShallow } from "zustand/react/shallow";

import {
	PlayerLayerView,
	useLayerDragGesture,
} from "@/components/player/playerLayerView";
import { QueueRow } from "@/components/player/queueRow";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirmDialog";
import { EmptyState } from "@/components/ui/emptyState";
import { SectionHeader, TopBar } from "@/components/ui/header";
import { formatTotalDuration, plural } from "@/lib/format";
import { closePlayer, queueLayer } from "@/player/nowPlaying";
import { usePlayerStore } from "@/player/playerStore";
import { getPreviousIndices, getUpcomingIndices } from "@/player/queue";

/** The queue, slid up over Now Playing; drag its bar down or press back to close it. */
export function QueueSheet() {
	return (
		<PlayerLayerView layer={queueLayer}>
			<Queue />
		</PlayerLayerView>
	);
}

function Queue() {
	const queue = usePlayerStore((state) => state.queue);
	const index = usePlayerStore((state) => state.index);
	// Recomputed only when the order changes, not on every status update.
	const previous = usePlayerStore(useShallow(getPreviousIndices));
	const upcoming = usePlayerStore(useShallow(getUpcomingIndices));
	const playQueueTrack = usePlayerStore((state) => state.playQueueTrack);
	const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
	const moveUpcoming = usePlayerStore((state) => state.moveUpcoming);
	const clearQueue = usePlayerStore((state) => state.clearQueue);
	const current = queue.at(index);
	const closeGesture = useLayerDragGesture(queueLayer, "close");
	const listRef = useRef<FlatList<number>>(null);
	// Opens at Now playing, once both its position and the list's size are known.
	const currentY = useRef<number | null>(null);
	const hasContent = useRef(false);
	const scrolledToCurrent = useRef(false);
	function scrollToCurrent() {
		if (scrolledToCurrent.current) return;
		if (currentY.current === null || !hasContent.current) return;
		scrolledToCurrent.current = true;
		listRef.current?.scrollToOffset({
			offset: currentY.current,
			animated: false,
		});
	}

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
			// Clears once the player is off screen, so it never slides away empty.
			onConfirm: () => closePlayer(clearQueue),
		});
	}

	return (
		<>
			<GestureDetector gesture={closeGesture}>
				<View>
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
						onLeadingPress={() => queueLayer.close()}
						title="Queue"
					/>
				</View>
			</GestureDetector>
			{current ? (
				<ReorderableList
					onContentSizeChange={() => {
						hasContent.current = true;
						scrollToCurrent();
					}}
					ref={listRef}
					// A third-party list, so padding is a style rather than a class.
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingBottom: 16,
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
							{previous.length > 0 && (
								<View className="pb-4">
									<SectionHeader title="Previous" />
									{previous.map((i, position) => (
										<QueueRow
											entry={queue[i]}
											// Shuffle history can repeat a track.
											key={`${position}-${queue[i].entryId}`}
											onPress={() => playQueueTrack(i)}
											onRemove={() => removeFromQueue(i)}
										/>
									))}
								</View>
							)}
							<View
								onLayout={(event) => {
									currentY.current = event.nativeEvent.layout.y;
									scrollToCurrent();
								}}
							>
								<SectionHeader title="Now playing" />
								<QueueRow
									entry={current}
									isCurrent
									onPress={() => playQueueTrack(index)}
									onRemove={() => removeFromQueue(index)}
								/>
							</View>
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
						<Button onPress={() => closePlayer()} variant="secondary">
							Back to library
						</Button>
					}
					description="Play an album or add tracks to see them here."
					icon="queue"
					title="Queue is empty"
				/>
			)}
		</>
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
