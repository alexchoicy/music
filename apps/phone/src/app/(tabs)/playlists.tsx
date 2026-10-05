import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreatePlaylistSheet } from "@/components/playlists/createPlaylistSheet";
import { PlaylistCard } from "@/components/playlists/playlistCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { IconButton } from "@/components/ui/iconButton";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { playlistQueries } from "@/lib/queries/playlist.queries";

const gridPadding = 16;
const gridGap = 12;
const columns = 3;

export default function PlaylistsScreen() {
	const [search, setSearch] = useState("");
	const [creating, setCreating] = useState(false);
	const playlists = useQuery(playlistQueries.getPlaylists());
	const queryClient = useQueryClient();

	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	// Screen already pads the horizontal safe-area insets.
	const itemWidth =
		(width -
			insets.left -
			insets.right -
			gridPadding * 2 -
			gridGap * (columns - 1)) /
		columns;

	// The playlists endpoint has no search, and a user's playlists are few enough to filter locally.
	const query = search.trim().toLocaleLowerCase();
	const visiblePlaylists = query
		? playlists.data?.filter((playlist) =>
				playlist.name.toLocaleLowerCase().includes(query),
			)
		: playlists.data;

	return (
		<Screen>
			<View className="px-4 pt-3 pb-3">
				<View className="flex-row gap-2">
					<SearchField
						onChangeText={setSearch}
						placeholder="Search playlists"
						value={search}
					/>
					<IconButton
						icon={{ ios: "plus", android: "add", web: "add" }}
						label="Create playlist"
						onPress={() => setCreating(true)}
					/>
				</View>
			</View>

			{playlists.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : playlists.data === undefined ? (
				<EmptyState
					action={
						<Button
							loading={playlists.isFetching}
							onPress={() => void playlists.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="Try again in a moment."
					title="Unable to load playlists"
				/>
			) : !visiblePlaylists?.length ? (
				query ? (
					<EmptyState
						description="Try a different search."
						title="No matching playlists"
					/>
				) : (
					<EmptyState
						action={
							<Button onPress={() => setCreating(true)}>Create playlist</Button>
						}
						description="Create a playlist to collect tracks from your library."
						title="No playlists yet"
					/>
				)
			) : (
				<FlatList
					columnWrapperStyle={{ gap: gridGap }}
					contentContainerStyle={{
						gap: 16,
						padding: gridPadding,
						paddingTop: 0,
					}}
					data={visiblePlaylists}
					keyboardDismissMode="on-drag"
					keyboardShouldPersistTaps="handled"
					keyExtractor={(playlist) => String(playlist.playlistId)}
					numColumns={columns}
					// Details are refreshed too, since card covers come from each playlist's entries.
					onRefresh={() =>
						void queryClient.invalidateQueries({ queryKey: ["playlists"] })
					}
					refreshing={playlists.isRefetching}
					renderItem={({ item }) => (
						<View style={{ width: itemWidth }}>
							<PlaylistCard playlist={item} />
						</View>
					)}
				/>
			)}

			<CreatePlaylistSheet onClose={() => setCreating(false)} open={creating} />
		</Screen>
	);
}
