import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatTrackDuration } from "@/lib/duration";
import { useArtworkUri, useIsOnline } from "@/lib/offline/media";
import type { QueueEntry } from "@/lib/player/track";
import { useOfflineStore } from "@/store/offlineStore";

type QueueRowProps = {
	entry: QueueEntry;
	isCurrent?: boolean;
	onPress: () => void;
	onRemove: () => void;
	/** Starts dragging the row; shows a drag handle when set. */
	onDragStart?: () => void;
	/** Accessibility alternatives to dragging; undefined at the ends of the list. */
	onMoveUp?: () => void;
	onMoveDown?: () => void;
};

export function QueueRow({
	entry,
	isCurrent = false,
	onPress,
	onRemove,
	onDragStart,
	onMoveUp,
	onMoveDown,
}: QueueRowProps) {
	const coverUrl = useArtworkUri(entry.cover);
	const isOnline = useIsOnline();
	const isDownloaded = useOfflineStore(
		(state) => state.tracks[entry.trackId]?.status === "downloaded",
	);
	const isUnavailable = !isOnline && !isDownloaded;
	const artists =
		entry.artists.map((artist) => artist.name).join(", ") || "Unknown artist";
	const duration = formatTrackDuration(entry.durationInMs);

	return (
		<View
			className={cn(
				"min-h-16 flex-row items-center gap-1 bg-background",
				isUnavailable && "opacity-50",
			)}
		>
			{onDragStart && (
				<Pressable
					// Screen readers use the Move up/down actions on the row instead.
					accessibilityElementsHidden
					className="h-11 w-8 items-center justify-center"
					importantForAccessibility="no-hide-descendants"
					onPressIn={onDragStart}
				>
					<Icon
						className="accent-muted-foreground"
						name={{
							ios: "line.3.horizontal",
							android: "drag_handle",
							web: "drag_handle",
						}}
						size={20}
					/>
				</Pressable>
			)}
			<Pressable
				accessibilityActions={[
					...(onMoveUp ? [{ name: "moveUp", label: "Move up" }] : []),
					...(onMoveDown ? [{ name: "moveDown", label: "Move down" }] : []),
				]}
				accessibilityHint={isCurrent ? undefined : "Plays this track"}
				accessibilityLabel={[
					entry.title,
					artists,
					duration,
					isUnavailable ? "Not available offline" : null,
				]
					.filter(Boolean)
					.join(", ")}
				accessibilityRole="button"
				accessibilityState={{ selected: isCurrent, disabled: isUnavailable }}
				className="flex-1 flex-row items-center gap-3 py-2 active:opacity-70"
				disabled={isUnavailable}
				onAccessibilityAction={(event) => {
					if (event.nativeEvent.actionName === "moveUp") onMoveUp?.();
					else if (event.nativeEvent.actionName === "moveDown") onMoveDown?.();
				}}
				onPress={onPress}
			>
				<View className="size-12 overflow-hidden rounded-md bg-muted">
					{coverUrl ? (
						<Image
							contentFit="cover"
							recyclingKey={entry.entryId}
							source={coverUrl}
							style={{ width: "100%", height: "100%" }}
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
								size={20}
							/>
						</View>
					)}
				</View>
				<View className="flex-1 gap-0.5">
					<Text
						className={cn(
							"text-sm text-foreground",
							isCurrent ? "font-semibold" : "font-medium",
						)}
						numberOfLines={1}
					>
						{entry.title}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{artists}
					</Text>
				</View>
				<Text className="text-xs text-muted-foreground tabular-nums">
					{duration}
				</Text>
			</Pressable>
			<Pressable
				accessibilityLabel={`Remove ${entry.title} from queue`}
				accessibilityRole="button"
				className="size-11 items-center justify-center rounded-full active:opacity-60"
				onPress={onRemove}
			>
				<Icon
					className="accent-muted-foreground"
					name={{ ios: "xmark", android: "close", web: "close" }}
					size={18}
				/>
			</Pressable>
		</View>
	);
}
