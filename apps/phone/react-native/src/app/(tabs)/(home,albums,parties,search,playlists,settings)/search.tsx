import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { PartyCard } from "@/components/parties/partyCard";
import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { ListRow } from "@/components/ui/listRow";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { useDebounced } from "@/lib/hooks";
import type { AlbumTile } from "@/lib/music";
import { filterAlbumTiles, getCover, toAlbumTile } from "@/lib/music";
import type { AlbumListItem, MatchedTrack, PartyListItem } from "@/lib/schema";
import {
	getDownloadedTiles,
	useArtworkUri,
	useIsOnline,
	useOfflineStore,
} from "@/offline/offlineStore";
import { searchQueries } from "@/queries/search";
import { useEndPadding } from "@/store/miniPlayerStore";

type ResultRow =
	| { kind: "album"; album: AlbumTile }
	| { kind: "track"; album: AlbumListItem; track: MatchedTrack };

/** Albums, each followed by the tracks on it that matched. */
function toRows(albums: AlbumListItem[]): ResultRow[] {
	return albums.flatMap((album) => [
		{ kind: "album" as const, album: toAlbumTile(album) },
		...(album.matchedTracks ?? []).map((track) => ({
			kind: "track" as const,
			album,
			track,
		})),
	]);
}

function rowKey(row: ResultRow) {
	return row.kind === "album"
		? `album-${row.album.albumId}`
		: `track-${row.album.albumId}-${row.track.trackId}`;
}

export default function SearchScreen() {
	const [search, setSearch] = useState("");
	const query = useDebounced(search.trim());
	const isOnline = useIsOnline();

	const results = useQuery({
		...searchQueries.search(query),
		// An empty query would return the whole library.
		enabled: isOnline && !!query,
	});

	// Offline, only downloaded albums are searched.
	const offlineAlbums = useOfflineStore((state) => state.albums);
	const offlineTracks = useOfflineStore((state) => state.tracks);
	const downloadMatches = isOnline
		? []
		: filterAlbumTiles(
				getDownloadedTiles({ albums: offlineAlbums, tracks: offlineTracks }),
				query,
				"TitleAsc",
			);

	function renderContent() {
		if (!query) {
			return (
				<EmptyState
					description={
						isOnline
							? "Find albums, tracks, and parties in your library."
							: "You're offline, so only downloaded albums are searched."
					}
					icon="search"
					title="Search your library"
				/>
			);
		}

		if (!isOnline) {
			return downloadMatches.length === 0 ? (
				<EmptyState
					description="You're offline, so only downloaded albums are searched."
					icon="offline"
					title="No matching downloads"
				/>
			) : (
				<Results
					parties={[]}
					rows={downloadMatches.map((album) => ({ kind: "album", album }))}
				/>
			);
		}

		if (results.isPending) return <Loading />;

		if (results.data === undefined) {
			return (
				<EmptyState
					action={
						<Button
							loading={results.isFetching}
							onPress={() => void results.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="Check your connection and try again."
					icon="offline"
					title="Couldn't search"
				/>
			);
		}

		const rows = toRows(results.data.albums);
		if (rows.length === 0 && results.data.parties.length === 0) {
			return (
				<EmptyState
					description="Try different words."
					icon="search"
					title={`No results for “${query}”`}
				/>
			);
		}

		return <Results parties={results.data.parties} rows={rows} />;
	}

	return (
		<Screen>
			<PageHeader title="Search" />
			<View className="flex-row px-4 pt-2 pb-3">
				<SearchField
					onChangeText={setSearch}
					placeholder="Albums, tracks, parties"
					value={search}
				/>
			</View>
			<View className="flex-1">{renderContent()}</View>
		</Screen>
	);
}

function Results({
	rows,
	parties,
}: {
	rows: ResultRow[];
	parties: PartyListItem[];
}) {
	const endPadding = useEndPadding(24);
	return (
		<FlatList
			contentContainerClassName="px-4"
			contentContainerStyle={{ paddingBottom: endPadding }}
			data={rows}
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			keyExtractor={rowKey}
			ListHeaderComponent={
				<>
					{parties.length > 0 && (
						<View className="gap-2 pb-4">
							<SectionHeader title="Parties" />
							<ScrollView
								contentContainerClassName="gap-4 px-4"
								className="-mx-4"
								horizontal
								keyboardShouldPersistTaps="handled"
								showsHorizontalScrollIndicator={false}
							>
								{parties.map((party) => (
									<PartyCard key={party.partyId} party={party} width={96} />
								))}
							</ScrollView>
						</View>
					)}
					{rows.length > 0 && <SectionHeader title="Albums" />}
				</>
			}
			renderItem={({ item }) =>
				item.kind === "album" ? (
					<AlbumResult album={item.album} />
				) : (
					<TrackResult album={item.album} track={item.track} />
				)
			}
		/>
	);
}

function AlbumResult({ album }: { album: AlbumTile }) {
	const coverUri = useArtworkUri(album.cover);
	const subtitle = [album.type, album.artists || "Unknown artist"].join(" · ");

	return (
		<Link
			asChild
			href={{ pathname: "/album/[id]", params: { id: album.albumId } }}
			push
		>
			<ListRow
				accessibilityLabel={`${album.title}, ${subtitle}`}
				accessibilityRole="link"
				leading={
					<Artwork recyclingKey={album.albumId} size={52} uri={coverUri} />
				}
				subtitle={subtitle}
				title={album.title}
			/>
		</Link>
	);
}

function TrackResult({
	album,
	track,
}: {
	album: AlbumListItem;
	track: MatchedTrack;
}) {
	const discCover = album.discCovers?.find(
		(disc) => Number(disc.discNumber) === Number(track.discNumber),
	);
	const coverUri = useArtworkUri(
		getCover(discCover?.variants) ?? getCover(album.coverVariants),
	);
	const position = `${track.discNumber}-${String(track.trackNumber).padStart(2, "0")}`;

	return (
		<Link
			asChild
			href={{ pathname: "/album/[id]", params: { id: String(album.albumId) } }}
			push
		>
			<Pressable
				accessibilityHint={`Opens ${album.title}`}
				accessibilityLabel={[
					`Track ${track.title}`,
					`disc ${track.discNumber}, track ${track.trackNumber}`,
					track.basedOnTrackTitle
						? `based on ${track.basedOnTrackTitle}`
						: null,
				]
					.filter(Boolean)
					.join(", ")}
				accessibilityRole="link"
				className="min-h-12 flex-row items-center gap-3 py-1.5 pl-16 active:opacity-60"
			>
				<Artwork
					icon="musicNote"
					recyclingKey={`track-${track.trackId}`}
					size={32}
					uri={coverUri}
				/>
				<View className="flex-1">
					<View className="flex-row items-center gap-2">
						<Text className="text-xs text-muted-foreground tabular-nums">
							{position}
						</Text>
						<Text className="shrink text-sm text-foreground" numberOfLines={1}>
							{track.title}
						</Text>
					</View>
					{!!track.basedOnTrackTitle && (
						<Text className="text-xs text-muted-foreground" numberOfLines={1}>
							Based on {track.basedOnTrackTitle}
						</Text>
					)}
				</View>
			</Pressable>
		</Link>
	);
}
