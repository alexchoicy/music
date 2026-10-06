import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, View } from "react-native";

import { PartyCard } from "@/components/parties/partyCard";
import type { PartyFilters } from "@/components/parties/partyFilterSheet";
import {
	countPartyFilters,
	defaultPartyFilters,
	PartyFilterSheet,
} from "@/components/parties/partyFilterSheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader } from "@/components/ui/header";
import { IconButton } from "@/components/ui/iconButton";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { SortSheet } from "@/components/ui/sortSheet";
import { gridGap, gridPadding, useDebounced, useGrid } from "@/lib/hooks";
import { partySortOptions } from "@/lib/music";
import type { ListSortOption } from "@/lib/schema";
import { partyQueries } from "@/queries/parties";
import { useEndPadding } from "@/store/miniPlayerStore";

export default function PartiesScreen() {
	const [search, setSearch] = useState("");
	const query = useDebounced(search.trim());
	const [filters, setFilters] = useState<PartyFilters>(defaultPartyFilters);
	const [sort, setSort] = useState<ListSortOption>("TitleAsc");
	const [openSheet, setOpenSheet] = useState<"filter" | "sort" | null>(null);
	const { columns, itemWidth } = useGrid(100, 3);
	const endPadding = useEndPadding(24);

	const parties = useQuery({
		...partyQueries.list({
			Search: query || undefined,
			Type: filters.type ?? undefined,
			Kind: filters.kind ?? undefined,
			Gender: filters.gender ?? undefined,
			ExcludeNoAlbums: filters.excludeNoAlbums,
			Sort: sort,
		}),
		placeholderData: keepPreviousData,
	});

	const filterCount = countPartyFilters(filters);
	const isFiltered = !!query || filterCount > 0;

	function renderContent() {
		if (parties.isPending) return <Loading />;

		if (
			parties.data === undefined ||
			// Offline, the results of an earlier search would show.
			(parties.isPlaceholderData && parties.fetchStatus === "paused")
		) {
			return (
				<EmptyState
					action={
						<Button
							loading={parties.isFetching}
							onPress={() => void parties.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="Check your connection and try again."
					icon="offline"
					title="Couldn't load parties"
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
				data={parties.data}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				keyExtractor={(party) => String(party.partyId)}
				// FlatList cannot change its column count, so it remounts instead.
				key={columns}
				ListEmptyComponent={
					<EmptyState
						description={
							isFiltered
								? "Try a different search or filter."
								: "Artists, groups, and projects will appear here."
						}
						icon="parties"
						title={isFiltered ? "No matching parties" : "No parties yet"}
					/>
				}
				numColumns={columns}
				onRefresh={() => void parties.refetch()}
				refreshing={parties.isRefetching && !parties.isPlaceholderData}
				renderItem={({ item }) => <PartyCard party={item} width={itemWidth} />}
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
				title="Parties"
			/>
			<View className="flex-row px-4 pt-2 pb-3">
				<SearchField
					onChangeText={setSearch}
					placeholder="Search parties"
					value={search}
				/>
			</View>
			<View className="flex-1">{renderContent()}</View>

			<PartyFilterSheet
				filters={filters}
				onChange={setFilters}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "filter"}
			/>
			<SortSheet
				onChange={setSort}
				onClose={() => setOpenSheet(null)}
				open={openSheet === "sort"}
				options={partySortOptions}
				sort={sort}
			/>
		</Screen>
	);
}
