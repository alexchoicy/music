import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, View } from "react-native";

import { PlaylistActions } from "@/components/playlists/playlistActions";
import { PlaylistCard } from "@/components/playlists/playlistCard";
import { PlaylistNameSheet } from "@/components/playlists/playlistNameSheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader } from "@/components/ui/header";
import { IconButton } from "@/components/ui/iconButton";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { gridGap, gridPadding, useGrid } from "@/lib/hooks";
import type { PlaylistListItem } from "@/lib/schema";
import { playlistQueries } from "@/queries/playlists";
import { useEndPadding } from "@/store/miniPlayerStore";

export default function PlaylistsScreen() {
	const [search, setSearch] = useState("");
	const [creating, setCreating] = useState(false);
	const [selectedId, setSelectedId] = useState<
		PlaylistListItem["playlistId"] | null
	>(null);
	const playlists = useQuery(playlistQueries.list());
	const queryClient = useQueryClient();
	const { columns, itemWidth } = useGrid(150);
	const endPadding = useEndPadding(24);

	// The endpoint has no search, and a user's playlists are few enough to filter here.
	const query = search.trim().toLocaleLowerCase();
	// Read from the list so a refresh after a conflict brings the current version.
	const selected =
		playlists.data?.find((playlist) => playlist.playlistId === selectedId) ??
		null;
	const visible = query
		? playlists.data?.filter((playlist) =>
				playlist.name.toLocaleLowerCase().includes(query),
			)
		: playlists.data;

	function renderContent() {
		if (playlists.isPending) return <Loading />;
		if (visible === undefined) {
			return (
				<EmptyState
					action={
						<Button
							loading={playlists.isFetching}
							onPress={() => void playlists.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="Check your connection and try again."
					icon="offline"
					title="Couldn't load playlists"
				/>
			);
		}

		return (
			<FlatList
				columnWrapperStyle={{ gap: gridGap }}
				contentContainerStyle={{
					flexGrow: 1,
					gap: 20,
					paddingHorizontal: gridPadding,
					paddingBottom: endPadding,
				}}
				data={visible}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				keyExtractor={(playlist) => String(playlist.playlistId)}
				// FlatList cannot change its column count, so it remounts instead.
				key={columns}
				ListEmptyComponent={
					query ? (
						<EmptyState
							description="Try a different search."
							icon="search"
							title="No matching playlists"
						/>
					) : (
						<EmptyState
							action={
								<Button icon="add" onPress={() => setCreating(true)}>
									New playlist
								</Button>
							}
							description="Collect tracks from your library in a playlist."
							icon="playlist"
							title="No playlists yet"
						/>
					)
				}
				numColumns={columns}
				// Details refresh too, since covers come from each playlist's entries.
				onRefresh={() =>
					void queryClient.invalidateQueries({ queryKey: ["playlists"] })
				}
				refreshing={playlists.isRefetching}
				renderItem={({ item }) => (
					<View style={{ width: itemWidth }}>
						<PlaylistCard
							onLongPress={() => setSelectedId(item.playlistId)}
							playlist={item}
						/>
					</View>
				)}
			/>
		);
	}

	return (
		<Screen>
			<PageHeader
				actions={
					<IconButton
						icon="add"
						label="New playlist"
						onPress={() => setCreating(true)}
					/>
				}
				title="Playlists"
			/>
			<View className="flex-row px-4 pt-2 pb-3">
				<SearchField
					onChangeText={setSearch}
					placeholder="Search playlists"
					value={search}
				/>
			</View>
			<View className="flex-1">{renderContent()}</View>
			<PlaylistNameSheet onClose={() => setCreating(false)} open={creating} />
			<PlaylistActions
				onClose={() => setSelectedId(null)}
				playlist={selected}
			/>
		</Screen>
	);
}
