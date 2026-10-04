import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumCard } from "@/components/albums/albumCard";
import type { AlbumFilters } from "@/components/albums/albumFilterSheet";
import { AlbumFilterSheet } from "@/components/albums/albumFilterSheet";
import { AlbumSortSheet } from "@/components/albums/albumSortSheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { Screen } from "@/components/ui/screen";
import type { ListSortOption } from "@/lib/album";
import { defaultListSort } from "@/lib/album";
import { albumQueries } from "@/lib/queries/album.queries";

const searchDebounceMs = 300;
const gridPadding = 16;
const gridGap = 12;
const columns = 3;

export default function AlbumsScreen() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [filters, setFilters] = useState<AlbumFilters>({
		types: [],
		languageIds: [],
	});
	const [sort, setSort] = useState<ListSortOption>(defaultListSort);
	const [openSheet, setOpenSheet] = useState<"filter" | "sort" | null>(null);

	useEffect(() => {
		const timeout = setTimeout(
			() => setDebouncedSearch(search.trim()),
			searchDebounceMs,
		);
		return () => clearTimeout(timeout);
	}, [search]);

	const albums = useQuery({
		...albumQueries.getAlbums({
			Search: debouncedSearch || undefined,
			Types: filters.types.length ? filters.types : undefined,
			LanguageIds: filters.languageIds.length ? filters.languageIds : undefined,
			Sort: sort,
		}),
		placeholderData: keepPreviousData,
	});

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

	const filterCount = filters.types.length + filters.languageIds.length;
	const hasQuery = !!debouncedSearch || filterCount > 0;

	return (
		<Screen>
			<View className="px-4 pt-3 pb-3">
				<View className="flex-row gap-2">
					<View className="h-11 flex-1 flex-row items-center gap-2 rounded-lg border border-border bg-background px-3">
						<Icon
							className="accent-muted-foreground"
							name={{
								ios: "magnifyingglass",
								android: "search",
								web: "search",
							}}
							size={18}
						/>
						<TextInput
							accessibilityLabel="Search albums"
							autoCapitalize="none"
							autoCorrect={false}
							className="flex-1 text-base text-foreground"
							onChangeText={setSearch}
							placeholder="Search albums"
							placeholderTextColorClassName="accent-muted-foreground"
							returnKeyType="search"
							value={search}
						/>
						{!!search && (
							<Pressable
								accessibilityLabel="Clear search"
								accessibilityRole="button"
								hitSlop={13}
								onPress={() => setSearch("")}
							>
								<Icon
									className="accent-muted-foreground"
									name={{
										ios: "xmark.circle.fill",
										android: "cancel",
										web: "cancel",
									}}
									size={18}
								/>
							</Pressable>
						)}
					</View>
					<IconButton
						badge={filterCount}
						icon={{
							ios: "slider.horizontal.3",
							android: "tune",
							web: "tune",
						}}
						label={filterCount ? `Filters, ${filterCount} active` : "Filters"}
						onPress={() => setOpenSheet("filter")}
					/>
					<IconButton
						icon={{ ios: "arrow.up.arrow.down", android: "sort", web: "sort" }}
						label="Sort"
						onPress={() => setOpenSheet("sort")}
					/>
				</View>
			</View>

			{albums.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : albums.isError ? (
				<EmptyState
					action={
						<Button
							loading={albums.isFetching}
							onPress={() => void albums.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="Try again in a moment."
					title="Unable to load albums"
				/>
			) : albums.data.length === 0 ? (
				<EmptyState
					description={
						hasQuery
							? "Try a different search or filter."
							: "Albums in your library will appear here."
					}
					title={hasQuery ? "No matching albums" : "No albums yet"}
				/>
			) : (
				<FlatList
					columnWrapperStyle={{ gap: gridGap }}
					contentContainerStyle={{
						gap: 16,
						padding: gridPadding,
						paddingTop: 0,
					}}
					data={albums.data}
					keyboardDismissMode="on-drag"
					keyboardShouldPersistTaps="handled"
					keyExtractor={(album) => String(album.albumId)}
					numColumns={columns}
					onRefresh={() => void albums.refetch()}
					refreshing={albums.isRefetching && !albums.isPlaceholderData}
					renderItem={({ item }) => (
						<View style={{ width: itemWidth }}>
							<AlbumCard album={item} />
						</View>
					)}
				/>
			)}

			<AlbumFilterSheet
				filters={filters}
				onChange={setFilters}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "filter"}
			/>
			<AlbumSortSheet
				onChange={setSort}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "sort"}
				sort={sort}
			/>
		</Screen>
	);
}
