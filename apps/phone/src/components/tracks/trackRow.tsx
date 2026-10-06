import { Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { cn } from "@/lib/cn";
import { formatTrackDuration } from "@/lib/format";
import type { FileObject } from "@/lib/schema";
import {
	useArtworkUri,
	useIsOnline,
	useOfflineStore,
} from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";

type TrackRowProps = {
	trackId: string;
	title: string;
	subtitle?: string;
	badges?: string[];
	durationInMs: number | string;
	/** Shown at the start: a track number, or a cover when given. */
	number?: string;
	cover?: FileObject | null;
	/** Whether the track has audio at all. */
	hasAudio: boolean;
	onPlay: () => void;
	/** Opens the track's actions; long press does the same. */
	onMore?: () => void;
};

export function TrackRow({
	trackId,
	title,
	subtitle,
	badges = [],
	durationInMs,
	number,
	cover,
	hasAudio,
	onPlay,
	onMore,
}: TrackRowProps) {
	const isCurrent = usePlayerStore(
		(state) => state.queue.at(state.index)?.trackId === trackId,
	);
	const download = useOfflineStore((state) => state.tracks[trackId]);
	const progress = useOfflineStore((state) => state.progress[trackId]);
	const isOnline = useIsOnline();
	const coverUri = useArtworkUri(cover);
	const isPlayable =
		hasAudio && (isOnline || download?.status === "downloaded");
	const duration = formatTrackDuration(durationInMs);
	const downloadLabel =
		download?.status === "downloaded"
			? "Downloaded"
			: download?.status === "queued"
				? "Waiting to download"
				: download?.status === "downloading"
					? `Downloading${progress === undefined ? "" : ` ${Math.round(progress * 100)}%`}`
					: download?.status === "failed"
						? "Download failed"
						: null;

	return (
		<View className={cn("flex-row items-center", !isPlayable && "opacity-45")}>
			<Pressable
				accessibilityActions={
					onMore ? [{ name: "longpress", label: "More actions" }] : undefined
				}
				accessibilityHint={isPlayable ? "Plays from this track" : undefined}
				accessibilityLabel={[
					isCurrent ? "Now playing" : null,
					number ? `Track ${number}` : null,
					title,
					...badges,
					subtitle,
					duration,
					downloadLabel,
					hasAudio && !isPlayable ? "Not available offline" : null,
				]
					.filter(Boolean)
					.join(", ")}
				accessibilityRole="button"
				accessibilityState={{ disabled: !isPlayable, selected: isCurrent }}
				className="min-h-15 flex-1 flex-row items-center gap-3 py-2 active:opacity-60"
				disabled={!isPlayable}
				onAccessibilityAction={() => onMore?.()}
				onLongPress={onMore}
				onPress={onPlay}
			>
				{cover !== undefined ? (
					<View>
						<Artwork
							icon="musicNote"
							recyclingKey={trackId}
							size={48}
							uri={coverUri}
						/>
						{isCurrent && (
							<View className="absolute inset-0 items-center justify-center rounded-md bg-scrim">
								<Icon className="accent-white" name="nowPlaying" size={20} />
							</View>
						)}
					</View>
				) : (
					<View className="w-7 items-center">
						{isCurrent ? (
							<Icon className="accent-primary" name="nowPlaying" size={18} />
						) : (
							<Text className="text-sm text-muted-foreground tabular-nums">
								{number}
							</Text>
						)}
					</View>
				)}
				<View className="flex-1 gap-0.5">
					<View className="flex-row items-center gap-1.5">
						<Text
							className={cn(
								"shrink text-base",
								isCurrent ? "font-semibold text-primary" : "text-foreground",
							)}
							numberOfLines={1}
						>
							{title}
						</Text>
						{badges.map((badge) => (
							<Badge key={badge} label={badge} />
						))}
					</View>
					<View className="flex-row items-center gap-1.5">
						{download?.status === "downloaded" && (
							<Icon className="accent-primary" name="downloaded" size={13} />
						)}
						{download?.status === "failed" && (
							<Icon className="accent-destructive" name="error" size={13} />
						)}
						{download?.status === "downloading" && progress !== undefined && (
							<Text className="text-xs font-medium text-primary tabular-nums">
								{Math.round(progress * 100)}%
							</Text>
						)}
						<Text
							className="shrink text-sm text-muted-foreground"
							numberOfLines={1}
						>
							{subtitle ? `${subtitle} · ${duration}` : duration}
						</Text>
					</View>
				</View>
			</Pressable>
			{onMore && (
				<IconButton
					disabled={!hasAudio}
					icon="more"
					iconClassName="accent-muted-foreground"
					label={`More actions for ${title}`}
					onPress={onMore}
					size={40}
				/>
			)}
		</View>
	);
}
