import type { components } from "@api/schema";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	SectionList,
	Text,
	View,
} from "react-native";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/searchField";
import { filterAlbums, getAlbumCover } from "@/lib/album";
import { cn } from "@/lib/cn";
import { defaultListSort } from "@/lib/listSort";
import { useClearTabHistory } from "@/lib/navigation";
import {
	getAlbumDownloadStats,
	toAlbumListItem,
	useArtworkUri,
	useIsOnline,
} from "@/lib/offline/media";
import { searchQueries } from "@/lib/queries/search.queries";
import type { OfflineAlbum } from "@/store/offlineStore";
import { useOfflineStore } from "@/store/offlineStore";

type AlbumListItem = components["schemas"]["AlbumListItem"];
type PartyItem = components["schemas"]["PartyItems"];
type MatchedTrack = components["schemas"]["AlbumListMatchedTrack"];

type ResultRow =
	| { kind: "album"; album: AlbumListItem }
	| { kind: "track"; album: AlbumListItem; track: MatchedTrack }
	| { kind: "party"; party: PartyItem };

type ResultSection = { title: string; data: ResultRow[] };

const searchDebounceMs = 300;

const albumIcon: IconName = {
	ios: "opticaldisc",
	android: "album",
	web: "album",
};
const trackIcon: IconName = {
	ios: "music.note",
	android: "music_note",
	web: "music_note",
};
const partyIcon: IconName = {
	ios: "person.fill",
	android: "person",
	web: "person",
};

function rowKey(row: ResultRow) {
	if (row.kind === "album") return `album-${row.album.albumId}`;
	if (row.kind === "track")
		return `track-${row.album.albumId}-${row.track.trackId}`;
	return `party-${row.party.partyId}`;
}

/** Albums followed by their matched tracks, then parties; empty sections are dropped. */
function toSections(albums: AlbumListItem[], parties: PartyItem[]) {
	const sections: ResultSection[] = [
		{
			title: "Albums",
			data: albums.flatMap((album): ResultRow[] => [
				{ kind: "album", album },
				...(album.matchedTracks ?? []).map((track) => ({
					kind: "track" as const,
					album,
					track,
				})),
			]),
		},
		{
			title: "Parties",
			data: parties.map((party) => ({ kind: "party" as const, party })),
		},
	];
	return sections.filter((section) => section.data.length > 0);
}

export default function SearchScreen() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timeout = setTimeout(
			() => setDebouncedSearch(search.trim()),
			searchDebounceMs,
		);
		return () => clearTimeout(timeout);
	}, [search]);

	const isOnline = useIsOnline();
	const results = useQuery({
		...searchQueries.getSearch(debouncedSearch),
		// An empty query returns the whole library.
		enabled: isOnline && !!debouncedSearch,
	});

	// Offline, only downloaded albums can be searched.
	const offlineAlbums = useOfflineStore((state) => state.albums);
	const offlineTracks = useOfflineStore((state) => state.tracks);
	const downloadStats = getAlbumDownloadStats(offlineTracks);
	const downloadedMatches = isOnline
		? []
		: filterAlbums(
				Object.values(offlineAlbums)
					.filter(
						(album): album is OfflineAlbum =>
							!!album && (downloadStats[album.albumId]?.downloaded ?? 0) > 0,
					)
					.map(toAlbumListItem),
				debouncedSearch,
				defaultListSort,
			);

	function renderResults(sections: ResultSection[]) {
		return (
			<SectionList
				contentContainerClassName="px-4 pb-4"
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				keyExtractor={rowKey}
				renderItem={({ item }) =>
					item.kind === "album" ? (
						<AlbumResultRow album={item.album} />
					) : item.kind === "track" ? (
						<TrackResultRow album={item.album} track={item.track} />
					) : (
						<PartyResultRow party={item.party} />
					)
				}
				renderSectionHeader={({ section }) => (
					<Text
						accessibilityRole="header"
						className="bg-background pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
						{section.title}
					</Text>
				)}
				sections={sections}
				stickySectionHeadersEnabled
			/>
		);
	}

	function renderContent() {
		if (!debouncedSearch) {
			return (
				<EmptyState
					description={
						isOnline
							? "Find albums, tracks, and parties."
							: "You're offline. Search your downloaded albums."
					}
					title="Search your library"
				/>
			);
		}

		if (!isOnline) {
			return downloadedMatches.length === 0 ? (
				<EmptyState
					description="You're offline, so only downloaded albums are searched."
					title="No matching downloads"
				/>
			) : (
				<>
					<Text
						accessibilityLiveRegion="polite"
						className="px-4 pb-1 text-xs text-muted-foreground"
					>
						You're offline. Showing downloaded albums.
					</Text>
					{renderResults(toSections(downloadedMatches, []))}
				</>
			);
		}

		if (results.isPending) {
			return (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			);
		}

		if (results.data === undefined) {
			return (
				<EmptyState
					action={
						<Button
							loading={results.isFetching}
							onPress={() => void results.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="Try again in a moment."
					title="Unable to search"
				/>
			);
		}

		const sections = toSections(results.data.albums, results.data.parties);
		if (sections.length === 0) {
			return (
				<EmptyState description="Try a different search." title="No results" />
			);
		}

		return renderResults(sections);
	}

	return (
		<Screen>
			<View className="px-4 pt-3 pb-3">
				<View className="flex-row">
					<SearchField
						onChangeText={setSearch}
						placeholder="Search albums, tracks, parties"
						value={search}
					/>
				</View>
			</View>
			{renderContent()}
		</Screen>
	);
}

type ThumbnailProps = {
	uri: string | null;
	icon: IconName;
	size: number;
	rounded?: boolean;
	recyclingKey: string;
};

function Thumbnail({ uri, icon, size, rounded, recyclingKey }: ThumbnailProps) {
	return (
		<View
			className={cn(
				"overflow-hidden bg-muted",
				rounded ? "rounded-full" : "rounded-md",
			)}
			style={{ width: size, height: size }}
		>
			{uri ? (
				<Image
					contentFit="cover"
					recyclingKey={recyclingKey}
					source={uri}
					style={{ width: "100%", height: "100%" }}
					transition={150}
				/>
			) : (
				<View className="flex-1 items-center justify-center">
					<Icon
						className="accent-muted-foreground"
						name={icon}
						size={size / 2.5}
					/>
				</View>
			)}
		</View>
	);
}

function AlbumResultRow({ album }: { album: AlbumListItem }) {
	const clearTabHistory = useClearTabHistory();
	const coverUrl = useArtworkUri(
		getAlbumCover(album.discCovers?.[0]?.variants) ??
			getAlbumCover(album.coverVariants),
	);
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	return (
		<Link
			asChild
			href={{ pathname: "/albums/[id]", params: { id: String(album.albumId) } }}
			onPress={(event) => clearTabHistory("albums", event)}
			push
			withAnchor
		>
			<Pressable
				accessibilityLabel={`${album.title}, ${album.type}, ${artistNames}`}
				accessibilityRole="link"
				className="min-h-16 flex-row items-center gap-3 py-2 active:opacity-70"
			>
				<Thumbnail
					icon={albumIcon}
					recyclingKey={`album-${album.albumId}`}
					size={48}
					uri={coverUrl}
				/>
				<View className="flex-1">
					<Text
						className="text-sm font-medium text-foreground"
						numberOfLines={1}
					>
						{album.title}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{album.type} · {artistNames}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}

type TrackResultRowProps = {
	album: AlbumListItem;
	track: MatchedTrack;
};

function TrackResultRow({ album, track }: TrackResultRowProps) {
	const clearTabHistory = useClearTabHistory();
	const discCover = album.discCovers?.find(
		(disc) => Number(disc.discNumber) === Number(track.discNumber),
	);
	const coverUrl = useArtworkUri(
		getAlbumCover(discCover?.variants) ?? getAlbumCover(album.coverVariants),
	);
	const position = `${track.discNumber}-${String(track.trackNumber).padStart(2, "0")}`;

	return (
		<Link
			asChild
			href={{ pathname: "/albums/[id]", params: { id: String(album.albumId) } }}
			onPress={(event) => clearTabHistory("albums", event)}
			push
			withAnchor
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
				className="min-h-12 flex-row items-center gap-3 py-1.5 pl-[60px] active:opacity-70"
			>
				<Thumbnail
					icon={trackIcon}
					recyclingKey={`track-${track.trackId}`}
					size={32}
					uri={coverUrl}
				/>
				<View className="flex-1">
					<View className="flex-row items-center gap-2">
						<Text className="text-[11px] text-muted-foreground tabular-nums">
							{position}
						</Text>
						<Text className="shrink text-sm text-foreground" numberOfLines={1}>
							{track.title}
						</Text>
					</View>
					{!!track.basedOnTrackTitle && (
						<Text
							className="text-[11px] text-muted-foreground"
							numberOfLines={1}
						>
							Based on {track.basedOnTrackTitle}
						</Text>
					)}
				</View>
			</Pressable>
		</Link>
	);
}

function PartyResultRow({ party }: { party: PartyItem }) {
	const clearTabHistory = useClearTabHistory();
	const albumCount = Number(party.albumCount);
	const aliases = party.aliases.map((alias) => alias.name).join(", ");
	const subtitle =
		aliases || `${albumCount} ${albumCount === 1 ? "release" : "releases"}`;

	return (
		<Link
			asChild
			href={{
				pathname: "/parties/[id]",
				params: { id: String(party.partyId) },
			}}
			onPress={(event) => clearTabHistory("parties", event)}
			push
			withAnchor
		>
			<Pressable
				accessibilityLabel={`${party.name}, ${subtitle}`}
				accessibilityRole="link"
				className="min-h-16 flex-row items-center gap-3 py-2 active:opacity-70"
			>
				<Thumbnail
					icon={partyIcon}
					recyclingKey={`party-${party.partyId}`}
					rounded
					size={48}
					uri={party.coverUrl || null}
				/>
				<View className="flex-1">
					<Text
						className="text-sm font-medium text-foreground"
						numberOfLines={1}
					>
						{party.name}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{subtitle}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
