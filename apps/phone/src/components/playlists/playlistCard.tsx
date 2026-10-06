import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { PlaylistCover } from "@/components/playlists/playlistCover";
import { formatTotalDuration, plural } from "@/lib/format";
import type { PlaylistListItem } from "@/lib/schema";
import { playlistQueries } from "@/queries/playlists";

type PlaylistCardProps = {
	playlist: PlaylistListItem;
	/** Opens the playlist's actions, e.g. Rename and Delete. */
	onLongPress: () => void;
};

export function PlaylistCard({ playlist, onLongPress }: PlaylistCardProps) {
	const trackCount = Number(playlist.trackCount);
	// List items have no artwork, so covers come from the playlist's entries.
	const details = useQuery({
		...playlistQueries.detail(playlist.playlistId),
		enabled: trackCount > 0,
	});
	const summary =
		trackCount === 0
			? "Empty"
			: `${plural(trackCount, "track")} · ${formatTotalDuration(playlist.totalDurationInMs)}`;

	return (
		<Link
			asChild
			href={{
				pathname: "/playlist/[id]",
				params: { id: String(playlist.playlistId) },
			}}
			push
		>
			<Pressable
				accessibilityLabel={`${playlist.name}, ${summary}`}
				accessibilityActions={[
					{ name: "longpress", label: "Playlist actions" },
				]}
				accessibilityRole="link"
				className="gap-2 active:opacity-70"
				onAccessibilityAction={(event) => {
					if (event.nativeEvent.actionName === "longpress") onLongPress();
				}}
				onLongPress={onLongPress}
			>
				<PlaylistCover
					entries={trackCount > 0 ? (details.data?.entries ?? []) : []}
				/>
				<View>
					<Text
						className="text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{playlist.name}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{summary}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
