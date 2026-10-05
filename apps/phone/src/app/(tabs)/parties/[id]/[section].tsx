import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumCard } from "@/components/albums/albumCard";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/ui/detailHeader";
import { EmptyState } from "@/components/ui/emptyState";
import { IconButton } from "@/components/ui/iconButton";
import { ListSortSheet } from "@/components/ui/listSortSheet";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { filterAlbums } from "@/lib/album";
import type { ListSortOption } from "@/lib/listSort";
import { defaultListSort } from "@/lib/listSort";
import { isPartyAlbumSection, partyAlbumSections } from "@/lib/party";
import { partyQueries } from "@/lib/queries/party.queries";

const gridPadding = 16;
const gridGap = 12;
const columns = 3;

export default function PartyAlbumsScreen() {
	const { id, section } = useLocalSearchParams<{
		id: string;
		section: string;
	}>();
	const party = useQuery(partyQueries.getParty(id));
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<ListSortOption>(defaultListSort);
	const [sorting, setSorting] = useState(false);

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

	if (!isPartyAlbumSection(section)) {
		return (
			<Screen>
				<DetailHeader />
				<EmptyState
					description="This list doesn't exist."
					title="Page not found"
				/>
			</Screen>
		);
	}

	const { title, field } = partyAlbumSections[section];
	// Party details hold every release, so searching and sorting stay local.
	const albums = party.data?.[field] ?? [];
	const visibleAlbums = filterAlbums(albums, search, sort);

	return (
		<Screen>
			<DetailHeader />
			{party.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : party.data === undefined ? (
				<EmptyState
					action={
						<Button
							loading={party.isFetching}
							onPress={() => void party.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="It may have been removed, or the server is unreachable."
					title="Unable to load party"
				/>
			) : (
				<>
					<View className="gap-3 px-4 pt-1 pb-3">
						<View>
							<Text
								accessibilityRole="header"
								className="text-xl font-semibold text-foreground"
							>
								{title}
							</Text>
							<Text className="text-sm text-muted-foreground" numberOfLines={1}>
								{party.data.name} · {albums.length}
							</Text>
						</View>
						<View className="flex-row gap-2">
							<SearchField
								onChangeText={setSearch}
								placeholder={`Search ${title.toLocaleLowerCase()}`}
								value={search}
							/>
							<IconButton
								icon={{
									ios: "arrow.up.arrow.down",
									android: "sort",
									web: "sort",
								}}
								label="Sort"
								onPress={() => setSorting(true)}
							/>
						</View>
					</View>

					{visibleAlbums.length === 0 ? (
						<EmptyState
							description={
								search.trim()
									? "Try a different search."
									: "Nothing to show here yet."
							}
							title={search.trim() ? "No matching albums" : "No albums"}
						/>
					) : (
						<FlatList
							columnWrapperStyle={{ gap: gridGap }}
							contentContainerStyle={{
								gap: 16,
								padding: gridPadding,
								paddingTop: 0,
							}}
							data={visibleAlbums}
							keyboardDismissMode="on-drag"
							keyboardShouldPersistTaps="handled"
							keyExtractor={(album) => String(album.albumId)}
							numColumns={columns}
							onRefresh={() => void party.refetch()}
							refreshing={party.isRefetching}
							renderItem={({ item }) => (
								<View style={{ width: itemWidth }}>
									<AlbumCard album={item} />
								</View>
							)}
						/>
					)}
				</>
			)}

			<ListSortSheet
				onChange={setSort}
				onClose={() => setSorting(false)}
				open={sorting}
				sort={sort}
			/>
		</Screen>
	);
}
