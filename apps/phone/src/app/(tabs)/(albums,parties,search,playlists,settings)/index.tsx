import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { AlbumFilters } from "@/components/albums/albumFilterSheet";
import { AlbumFilterSheet } from "@/components/albums/albumFilterSheet";
import { AlbumGrid } from "@/components/albums/albumGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { SortSheet } from "@/components/ui/sortSheet";
import { useDebounced } from "@/lib/hooks";
import { albumSortOptions, filterAlbumTiles, toAlbumTile } from "@/lib/music";
import type { ListSortOption } from "@/lib/schema";
import {
	getDownloadedTiles,
	useIsOnline,
	useOfflineStore,
} from "@/offline/offlineStore";
import { albumQueries } from "@/queries/albums";

export default function AlbumsScreen() {
	const [search, setSearch] = useState("");
	const query = useDebounced(search.trim());
	const [filters, setFilters] = useState<Omit<AlbumFilters, "downloadedOnly">>({
		types: [],
		languageIds: [],
	});
	const [sort, setSort] = useState<ListSortOption>("TitleAsc");
	const [openSheet, setOpenSheet] = useState<"filter" | "sort" | null>(null);

	const isOnline = useIsOnline();
	// Offline shows downloads by default; a manual choice lasts until connectivity changes.
	const [downloadedChoice, setDownloadedChoice] = useState<{
		value: boolean;
		online: boolean;
	} | null>(null);
	const downloadedOnly =
		downloadedChoice?.online === isOnline ? downloadedChoice.value : !isOnline;
	const setDownloadedOnly = (value: boolean) =>
		setDownloadedChoice({ value, online: isOnline });

	const offlineAlbums = useOfflineStore((state) => state.albums);
	const offlineTracks = useOfflineStore((state) => state.tracks);
	const downloads = filterAlbumTiles(
		getDownloadedTiles({ albums: offlineAlbums, tracks: offlineTracks }).filter(
			(album) =>
				filters.types.length === 0 || filters.types.includes(album.type),
		),
		query,
		sort,
	);

	const albums = useQuery({
		...albumQueries.list({
			Search: query || undefined,
			Types: filters.types,
			LanguageIds: filters.languageIds,
			Sort: sort,
		}),
		placeholderData: keepPreviousData,
		enabled: !downloadedOnly,
	});

	// Downloaded albums have no languages, so that filter does not apply to them.
	const filterCount =
		filters.types.length + (downloadedOnly ? 1 : filters.languageIds.length);
	const isFiltered = !!query || filters.types.length > 0;

	const header = (
		<View className="gap-3 px-4 pt-2 pb-3">
			<View className="flex-row">
				<SearchField
					onChangeText={setSearch}
					placeholder="Search albums"
					value={search}
				/>
			</View>
			{!isOnline && (
				<View
					accessibilityLiveRegion="polite"
					className="flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-2.5"
				>
					<Icon className="accent-muted-foreground" name="offline" size={18} />
					<Text className="flex-1 text-sm text-muted-foreground">
						{downloadedOnly
							? "You're offline. Showing downloads."
							: "You're offline."}
					</Text>
					{downloadedOnly && (
						<Pressable
							accessibilityRole="button"
							className="min-h-11 justify-center active:opacity-60"
							onPress={() => setDownloadedOnly(false)}
						>
							<Text className="text-sm font-semibold text-primary">
								Show all
							</Text>
						</Pressable>
					)}
				</View>
			)}
		</View>
	);

	function renderContent() {
		if (downloadedOnly) {
			return (
				<AlbumGrid
					albums={downloads}
					empty={
						<EmptyState
							action={
								!isFiltered && (
									<Button
										onPress={() => setDownloadedOnly(false)}
										variant="secondary"
									>
										Show all albums
									</Button>
								)
							}
							description={
								isFiltered
									? "Try a different search or filter."
									: "Download an album from its page to listen offline."
							}
							icon="download"
							title={isFiltered ? "No matching downloads" : "No downloads yet"}
						/>
					}
				/>
			);
		}

		if (albums.isPending) return <Loading />;

		if (
			albums.data === undefined ||
			// Offline, the results of an earlier search would show.
			(albums.isPlaceholderData && albums.fetchStatus === "paused")
		) {
			return (
				<EmptyState
					action={
						<Button
							loading={albums.isFetching}
							onPress={() => void albums.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="Check your connection and try again."
					icon="offline"
					title="Couldn't load albums"
				/>
			);
		}

		return (
			<AlbumGrid
				albums={albums.data.map(toAlbumTile)}
				empty={
					<EmptyState
						description={
							isFiltered || filterCount > 0
								? "Try a different search or filter."
								: "Albums in your library will appear here."
						}
						icon="album"
						title={
							isFiltered || filterCount > 0
								? "No matching albums"
								: "No albums yet"
						}
					/>
				}
				onRefresh={() => void albums.refetch()}
				refreshing={albums.isRefetching && !albums.isPlaceholderData}
			/>
		);
	}

	return (
		<Screen>
			<PageHeader
				actions={
					<>
						<IconButton
							badge={filterCount}
							icon="filter"
							label={filterCount ? `Filters, ${filterCount} on` : "Filters"}
							onPress={() => setOpenSheet("filter")}
						/>
						<IconButton
							icon="sort"
							label="Sort"
							onPress={() => setOpenSheet("sort")}
						/>
					</>
				}
				title="Albums"
			/>
			{header}
			<View className="flex-1">{renderContent()}</View>

			<AlbumFilterSheet
				filters={{ ...filters, downloadedOnly }}
				onChange={({ downloadedOnly: next, ...rest }) => {
					setFilters(rest);
					if (next !== downloadedOnly) setDownloadedOnly(next);
				}}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "filter"}
			/>
			<SortSheet
				onChange={setSort}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "sort"}
				options={albumSortOptions}
				sort={sort}
			/>
		</Screen>
	);
}
