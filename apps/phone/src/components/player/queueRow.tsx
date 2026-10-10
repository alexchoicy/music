import { Pressable, Text, View } from "react-native";

import { openTrackActions } from "@/components/tracks/trackActions";
import { Artwork } from "@/components/ui/artwork";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { cn } from "@/lib/cn";
import { formatTrackDuration } from "@/lib/format";
import {
	useArtworkUri,
	useIsOnline,
	useOfflineStore,
} from "@/offline/offlineStore";
import type { QueueEntry } from "@/player/track";

type QueueRowProps = {
	entry: QueueEntry;
	isCurrent?: boolean;
	onPress: () => void;
	onRemove: () => void;
	/** Starts dragging the row; shows a drag handle when set. */
	onDragStart?: () => void;
	/** Screen reader alternatives to dragging; unset at the ends of the list. */
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
	const coverUri = useArtworkUri(entry.cover);
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
				"min-h-16 flex-row items-center bg-background",
				isUnavailable && "opacity-45",
			)}
		>
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
				className="flex-1 flex-row items-center gap-3 py-2 active:opacity-60"
				disabled={isUnavailable}
				onAccessibilityAction={(event) => {
					if (event.nativeEvent.actionName === "moveUp") onMoveUp?.();
					else if (event.nativeEvent.actionName === "moveDown") onMoveDown?.();
				}}
				onPress={onPress}
			>
				<Artwork
					icon="musicNote"
					recyclingKey={entry.entryId}
					size={48}
					uri={coverUri}
				/>
				<View className="flex-1 gap-0.5">
					<Text
						className={cn(
							"text-base",
							isCurrent ? "font-semibold text-primary" : "text-foreground",
						)}
						numberOfLines={1}
					>
						{entry.title}
					</Text>
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{artists} · {duration}
					</Text>
				</View>
			</Pressable>
			<IconButton
				icon="more"
				iconClassName="accent-muted-foreground"
				iconSize={20}
				label={`More actions for ${entry.title}`}
				onPress={() => openTrackActions({ track: entry, fromPlayer: true })}
				size={48}
			/>
			<IconButton
				icon="close"
				iconClassName="accent-muted-foreground"
				iconSize={18}
				label={`Remove ${entry.title} from queue`}
				onPress={onRemove}
				size={48}
			/>
			{onDragStart && (
				<Pressable
					// Screen readers use the row's Move up and Move down actions instead.
					accessibilityElementsHidden
					className="size-12 items-center justify-center"
					importantForAccessibility="no-hide-descendants"
					onPressIn={onDragStart}
				>
					<Icon className="accent-muted-foreground" name="drag" size={22} />
				</Pressable>
			)}
		</View>
	);
}
