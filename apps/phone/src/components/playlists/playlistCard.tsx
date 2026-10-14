import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { PlaylistCover } from "@/components/playlists/playlistCover";
import { usePlayPlaylist } from "@/components/playlists/usePlayPlaylist";
import { ArtworkPlayButton } from "@/components/ui/artworkPlayButton";
import { PlayingBars } from "@/components/ui/playingBars";
import { PlayingGlow } from "@/components/ui/playingGlow";
import { cn } from "@/lib/cn";
import { formatTotalDuration, plural } from "@/lib/format";
import type { PlaylistListItem } from "@/lib/schema";
import { usePlayerStore } from "@/player/playerStore";

type PlaylistCardProps = {
	playlist: PlaylistListItem;
	width: number;
	/** Opens the playlist's actions, e.g. Rename and Delete. */
	onLongPress: () => void;
};

const playButtonInset = 8;
const playButtonSize = 40;

export function PlaylistCard({
	playlist,
	width,
	onLongPress,
}: PlaylistCardProps) {
	const playPlaylist = usePlayPlaylist();
	const trackCount = Number(playlist.trackCount);
	const isPlaying = usePlayerStore(
		(state) =>
			state.status === "playing" &&
			state.queue.at(state.index)?.playlist?.id === String(playlist.playlistId),
	);
	const summary =
		trackCount === 0
			? "Empty"
			: `${plural(trackCount, "track")} · ${formatTotalDuration(playlist.totalDurationInMs)}`;

	const play = () => playPlaylist(playlist.playlistId);

	return (
		<View style={{ width }}>
			<Link
				asChild
				href={{
					pathname: "/playlist/[id]",
					params: { id: String(playlist.playlistId) },
				}}
				push
			>
				<Pressable
					accessibilityLabel={[
						isPlaying ? "Now playing" : null,
						playlist.name,
						summary,
					]
						.filter(Boolean)
						.join(", ")}
					accessibilityActions={[
						{ name: "longpress", label: "Playlist actions" },
						...(trackCount > 0 ? [{ name: "play", label: "Play" }] : []),
					]}
					accessibilityRole="link"
					className="gap-2.5 active:opacity-70"
					onAccessibilityAction={(event) => {
						if (event.nativeEvent.actionName === "longpress") onLongPress();
						if (event.nativeEvent.actionName === "play") void play();
					}}
					onLongPress={onLongPress}
				>
					<View>
						<PlaylistCover files={playlist.covers.map((cover) => cover.file)} />
						{isPlaying && <PlayingGlow className="rounded-xl" />}
					</View>
					<View className="gap-0.5">
						<View className="flex-row items-center gap-1.5">
							{isPlaying && <PlayingBars />}
							<Text
								className={cn(
									"shrink text-sm font-semibold",
									isPlaying ? "text-primary" : "text-foreground",
								)}
								numberOfLines={1}
							>
								{playlist.name}
							</Text>
						</View>
						<Text className="text-xs text-muted-foreground" numberOfLines={1}>
							{summary}
						</Text>
					</View>
				</Pressable>
			</Link>
			{trackCount > 0 && (
				<ArtworkPlayButton
					className="absolute"
					label={`Play ${playlist.name}`}
					onPlay={play}
					style={{
						top: width - playButtonSize - playButtonInset,
						right: playButtonInset,
					}}
				/>
			)}
		</View>
	);
}
