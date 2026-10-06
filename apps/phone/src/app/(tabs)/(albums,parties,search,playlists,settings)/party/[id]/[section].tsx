import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AlbumGrid } from "@/components/albums/albumGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { TopBar } from "@/components/ui/header";
import { IconButton } from "@/components/ui/iconButton";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { SortSheet } from "@/components/ui/sortSheet";
import {
	albumSortOptions,
	filterAlbumTiles,
	isPartyAlbumSection,
	partyAlbumSections,
	toAlbumTile,
} from "@/lib/music";
import type { ListSortOption } from "@/lib/schema";
import { partyQueries } from "@/queries/parties";

export default function PartyAlbumsScreen() {
	const { id, section } = useLocalSearchParams<{
		id: string;
		section: string;
	}>();
	const party = useQuery(partyQueries.detail(id));
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<ListSortOption>("TitleAsc");
	const [sorting, setSorting] = useState(false);

	if (!isPartyAlbumSection(section)) {
		return (
			<Screen>
				<TopBar />
				<EmptyState
					description="This list doesn't exist."
					title="Page not found"
				/>
			</Screen>
		);
	}

	const { title, field } = partyAlbumSections[section];

	return (
		<Screen>
			<TopBar
				actions={
					<IconButton
						icon="sort"
						label="Sort"
						onPress={() => setSorting(true)}
					/>
				}
				title={title}
			/>
			{party.isPending ? (
				<Loading />
			) : party.data === undefined ? (
				<EmptyState
					action={
						<Button
							loading={party.isFetching}
							onPress={() => void party.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="It may have been removed, or the server can't be reached."
					icon="person"
					title="Couldn't load party"
				/>
			) : (
				<>
					<View className="gap-3 px-4 pb-3">
						<Text
							className="text-center text-sm text-muted-foreground"
							numberOfLines={1}
						>
							{party.data.name} · {party.data[field].length}
						</Text>
						<View className="flex-row">
							<SearchField
								onChangeText={setSearch}
								placeholder={`Search ${title.toLocaleLowerCase()}`}
								value={search}
							/>
						</View>
					</View>
					<AlbumGrid
						// Party details hold every release, so search and sort stay on the phone.
						albums={filterAlbumTiles(
							party.data[field].map(toAlbumTile),
							search,
							sort,
						)}
						empty={
							<EmptyState
								description={
									search.trim()
										? "Try a different search."
										: "Nothing here yet."
								}
								icon="album"
								title={search.trim() ? "No matching albums" : "No albums"}
							/>
						}
						onRefresh={() => void party.refetch()}
						refreshing={party.isRefetching}
					/>
				</>
			)}
			<SortSheet
				onChange={setSort}
				onClose={() => setSorting(false)}
				open={sorting}
				options={albumSortOptions}
				sort={sort}
			/>
		</Screen>
	);
}
