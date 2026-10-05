import type { components } from "@api/schema";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumCard } from "@/components/albums/albumCard";
import type { AlbumFilters } from "@/components/albums/albumFilterSheet";
import { AlbumFilterSheet } from "@/components/albums/albumFilterSheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { IconButton } from "@/components/ui/iconButton";
import { ListSortSheet } from "@/components/ui/listSortSheet";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { filterAlbums } from "@/lib/album";
import type { ListSortOption } from "@/lib/listSort";
import { defaultListSort } from "@/lib/listSort";
import {
	getAlbumDownloadStats,
	toAlbumListItem,
	useIsOnline,
} from "@/lib/offline/media";
import { albumQueries } from "@/lib/queries/album.queries";
import type { OfflineAlbum } from "@/store/offlineStore";
import { useOfflineStore } from "@/store/offlineStore";

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

	const isOnline = useIsOnline();
	// Offline defaults to downloaded albums. A manual choice lasts until connectivity changes.
	const [downloadedOverride, setDownloadedOverride] = useState<boolean | null>(
		null,
	);
	const [overrideOnline, setOverrideOnline] = useState(isOnline);
	if (overrideOnline !== isOnline) {
		setOverrideOnline(isOnline);
		setDownloadedOverride(null);
	}
	const downloadedOnly = downloadedOverride ?? !isOnline;
	const setDownloadedOnly = setDownloadedOverride;

	const offlineAlbums = useOfflineStore((state) => state.albums);
	const offlineTracks = useOfflineStore((state) => state.tracks);
	const downloadStats = getAlbumDownloadStats(offlineTracks);
	const downloadedAlbums = filterAlbums(
		Object.values(offlineAlbums)
			// Only albums with at least one track that can play offline.
			.filter(
				(album): album is OfflineAlbum =>
					!!album && (downloadStats[album.albumId]?.downloaded ?? 0) > 0,
			)
			.map(toAlbumListItem)
			.filter(
				(album) => !filters.types.length || filters.types.includes(album.type),
			),
		debouncedSearch,
		sort,
	);

	const albums = useQuery({
		...albumQueries.getAlbums({
			Search: debouncedSearch || undefined,
			Types: filters.types.length ? filters.types : undefined,
			LanguageIds: filters.languageIds.length ? filters.languageIds : undefined,
			Sort: sort,
		}),
		placeholderData: keepPreviousData,
		enabled: !downloadedOnly,
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

	// Language filters do not apply to downloaded albums.
	const filterCount =
		filters.types.length + (downloadedOnly ? 1 : filters.languageIds.length);
	const hasQuery = !!debouncedSearch || filterCount > 0;
	// "Downloaded only" is the mode itself, not a query that could match nothing.
	const hasDownloadQuery = !!debouncedSearch || filters.types.length > 0;

	function renderGrid(
		data: components["schemas"]["AlbumListItem"][],
		refresh?: { onRefresh: () => void; refreshing: boolean },
	) {
		return (
			<FlatList
				columnWrapperStyle={{ gap: gridGap }}
				contentContainerStyle={{
					gap: 16,
					padding: gridPadding,
					paddingTop: 0,
				}}
				data={data}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				keyExtractor={(album) => String(album.albumId)}
				numColumns={columns}
				onRefresh={refresh?.onRefresh}
				refreshing={refresh?.refreshing}
				renderItem={({ item }) => (
					<View style={{ width: itemWidth }}>
						<AlbumCard album={item} />
					</View>
				)}
			/>
		);
	}

	return (
		<Screen>
			<View className="px-4 pt-3 pb-3">
				<View className="flex-row gap-2">
					<SearchField
						onChangeText={setSearch}
						placeholder="Search albums"
						value={search}
					/>
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

			{!isOnline && downloadedOnly && (
				<View className="flex-row items-center justify-between gap-3 px-4 pb-1">
					<Text
						accessibilityLiveRegion="polite"
						className="flex-1 text-xs text-muted-foreground"
					>
						You're offline. Showing downloaded albums.
					</Text>
					<Pressable
						accessibilityRole="button"
						className="min-h-11 justify-center active:opacity-60"
						onPress={() => setDownloadedOnly(false)}
					>
						<Text className="text-xs font-medium text-foreground">
							Show all
						</Text>
					</Pressable>
				</View>
			)}

			{downloadedOnly ? (
				downloadedAlbums.length === 0 ? (
					<EmptyState
						action={
							!hasDownloadQuery && (
								<Button
									onPress={() => setDownloadedOnly(false)}
									variant="outline"
								>
									Show all albums
								</Button>
							)
						}
						description={
							hasDownloadQuery
								? "Try a different search or filter."
								: "Download an album from its page to listen offline."
						}
						title={
							hasDownloadQuery
								? "No matching downloads"
								: "No downloaded albums"
						}
					/>
				) : (
					renderGrid(downloadedAlbums)
				)
			) : albums.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : albums.data === undefined ||
			  // Results for the previous search would be shown while offline.
			  (albums.isPlaceholderData && albums.fetchStatus === "paused") ? (
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
				renderGrid(albums.data, {
					onRefresh: () => void albums.refetch(),
					refreshing: albums.isRefetching && !albums.isPlaceholderData,
				})
			)}

			<AlbumFilterSheet
				downloadedOnly={downloadedOnly}
				filters={filters}
				onChange={setFilters}
				onDownloadedOnlyChange={setDownloadedOnly}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "filter"}
			/>
			<ListSortSheet
				onChange={setSort}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "sort"}
				sort={sort}
			/>
		</Screen>
	);
}
