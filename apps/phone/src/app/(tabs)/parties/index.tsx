import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartyCard } from "@/components/parties/partyCard";
import type { PartyFilters } from "@/components/parties/partyFilterSheet";
import {
	defaultPartyFilters,
	PartyFilterSheet,
} from "@/components/parties/partyFilterSheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { IconButton } from "@/components/ui/iconButton";
import { ListSortSheet } from "@/components/ui/listSortSheet";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import type { ListSortOption } from "@/lib/listSort";
import { defaultListSort } from "@/lib/listSort";
import { partySortOptions } from "@/lib/party";
import { partyQueries } from "@/lib/queries/party.queries";

const searchDebounceMs = 300;
const gridPadding = 16;
const gridGap = 12;
const columns = 3;

export default function PartiesScreen() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [filters, setFilters] = useState<PartyFilters>(defaultPartyFilters);
	const [sort, setSort] = useState<ListSortOption>(defaultListSort);
	const [openSheet, setOpenSheet] = useState<"filter" | "sort" | null>(null);

	useEffect(() => {
		const timeout = setTimeout(
			() => setDebouncedSearch(search.trim()),
			searchDebounceMs,
		);
		return () => clearTimeout(timeout);
	}, [search]);

	const parties = useQuery({
		...partyQueries.getParties({
			Search: debouncedSearch || undefined,
			Type: filters.type ?? undefined,
			Kind: filters.kind ?? undefined,
			Gender: filters.gender ?? undefined,
			ExcludeNoAlbums: filters.excludeNoAlbums,
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

	const filterCount =
		[filters.type, filters.kind, filters.gender].filter(Boolean).length +
		(filters.excludeNoAlbums === defaultPartyFilters.excludeNoAlbums ? 0 : 1);
	const hasQuery = !!debouncedSearch || filterCount > 0;

	return (
		<Screen>
			<View className="px-4 pt-3 pb-3">
				<View className="flex-row gap-2">
					<SearchField
						onChangeText={setSearch}
						placeholder="Search parties"
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

			{parties.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : parties.data === undefined ||
			  // Results for the previous search would be shown while offline.
			  (parties.isPlaceholderData && parties.fetchStatus === "paused") ? (
				<EmptyState
					action={
						<Button
							loading={parties.isFetching}
							onPress={() => void parties.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="Try again in a moment."
					title="Unable to load parties"
				/>
			) : parties.data.length === 0 ? (
				<EmptyState
					description={
						hasQuery
							? "Try a different search or filter."
							: "Artists, groups, and projects will appear here."
					}
					title={hasQuery ? "No matching parties" : "No parties yet"}
				/>
			) : (
				<FlatList
					columnWrapperStyle={{ gap: gridGap }}
					contentContainerStyle={{
						gap: 16,
						padding: gridPadding,
						paddingTop: 0,
					}}
					data={parties.data}
					keyboardDismissMode="on-drag"
					keyboardShouldPersistTaps="handled"
					keyExtractor={(party) => String(party.partyId)}
					numColumns={columns}
					onRefresh={() => void parties.refetch()}
					refreshing={parties.isRefetching && !parties.isPlaceholderData}
					renderItem={({ item }) => (
						<View style={{ width: itemWidth }}>
							<PartyCard party={item} />
						</View>
					)}
				/>
			)}

			<PartyFilterSheet
				filters={filters}
				onChange={setFilters}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "filter"}
			/>
			<ListSortSheet
				onChange={setSort}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "sort"}
				options={partySortOptions}
				sort={sort}
			/>
		</Screen>
	);
}
