import { router } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { SectionList, Text, View } from "react-native";

import { PlaylistCover } from "@/components/playlists/playlistCover";
import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirmDialog";
import { EmptyState } from "@/components/ui/emptyState";
import { SectionHeader, TopBar } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { ListRow } from "@/components/ui/listRow";
import { Screen } from "@/components/ui/screen";
import { cn } from "@/lib/cn";
import { formatFileSize, plural } from "@/lib/format";
import { getCover, joinNames } from "@/lib/music";
import {
	removeAlbumDownloads,
	removePlaylistDownloads,
} from "@/offline/downloads";
import type {
	AlbumDownloadStats,
	OfflineAlbum,
	OfflinePlaylist,
} from "@/offline/offlineStore";
import {
	emptyDownloadStats,
	getDownloadStats,
	getPlaylistDownloadStats,
	useArtworkUri,
	useOfflineStore,
} from "@/offline/offlineStore";
import { useEndPadding } from "@/store/miniPlayerStore";

type DownloadItem = { key: string; stats: AlbumDownloadStats } & (
	| { album: OfflineAlbum; playlist?: never }
	| { playlist: OfflinePlaylist; album?: never }
);

function getStatus(stats: AlbumDownloadStats, trackLabel: string) {
	if (stats.total === 0) return "No tracks";
	const tracks = plural(stats.total, trackLabel);
	if (stats.downloaded + stats.failed < stats.total) {
		const failed = stats.failed > 0 ? ` · ${stats.failed} failed` : "";
		return `Downloading ${stats.downloaded} of ${tracks}${failed}`;
	}
	if (stats.failed > 0) return `${stats.failed} of ${tracks} failed`;
	return `${tracks} · ${formatFileSize(stats.sizeInBytes)}`;
}

export default function DownloadsScreen() {
	const albumMap = useOfflineStore((state) => state.albums);
	const playlistMap = useOfflineStore((state) => state.playlists);
	const playlistTrackIds = useOfflineStore((state) => state.playlistTrackIds);
	const tracks = useOfflineStore((state) => state.tracks);
	const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
	const selecting = selected !== null;
	const endPadding = useEndPadding(16);

	const totalSize = Object.values(getDownloadStats(tracks)).reduce(
		(sum, album) => sum + (album?.sizeInBytes ?? 0),
		0,
	);
	// Partial albums list only the tracks saved while playing; playlists list their own.
	const albumStats = getDownloadStats(
		Object.fromEntries(
			Object.entries(tracks).filter(
				([trackId, track]) =>
					!playlistTrackIds.has(trackId) ||
					(track && albumMap[track.albumId]?.kind === "album"),
			),
		),
	);
	const albums = Object.values(albumMap)
		.filter((album) => album !== undefined)
		.filter(
			(album) =>
				album.kind === "album" || (albumStats[album.albumId]?.total ?? 0) > 0,
		)
		.sort((a, b) => b.downloadedAt - a.downloadedAt)
		.map((album): DownloadItem => ({
			key: `album:${album.albumId}`,
			album,
			stats: albumStats[album.albumId] ?? emptyDownloadStats,
		}));
	const playlists = Object.values(playlistMap)
		.filter((playlist) => playlist !== undefined)
		.sort((a, b) => b.downloadedAt - a.downloadedAt)
		.map((playlist): DownloadItem => ({
			key: `playlist:${playlist.playlistId}`,
			playlist,
			stats: getPlaylistDownloadStats(playlist, tracks),
		}));
	const items = [...playlists, ...albums];
	const sections = [
		{ title: "Playlists", data: playlists },
		{ title: "Albums", data: albums },
	].filter((section) => section.data.length > 0);
	// Downloads removed while selected drop out.
	const selectedItems = items.filter((item) => selected?.has(item.key));
	const allSelected = items.length > 0 && selectedItems.length === items.length;
	const summary = [
		playlists.length > 0 && plural(playlists.length, "playlist"),
		albums.length > 0 && plural(albums.length, "album"),
		formatFileSize(totalSize),
	]
		.filter(Boolean)
		.join(" · ");

	function toggle(key: string) {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	function confirmDelete() {
		const count = selectedItems.length;
		const size = selectedItems.reduce(
			(sum, item) => sum + item.stats.sizeInBytes,
			0,
		);
		confirm({
			title: `Delete ${plural(count, "download")}?`,
			message: `This frees up to ${formatFileSize(size)}. ${count === 1 ? "It stays" : "They stay"} in your library.`,
			confirmLabel: "Delete",
			onConfirm: () => {
				removePlaylistDownloads(
					selectedItems.flatMap((item) =>
						item.playlist ? [String(item.playlist.playlistId)] : [],
					),
				);
				removeAlbumDownloads(
					selectedItems.flatMap((item) =>
						item.album ? [item.album.albumId] : [],
					),
				);
				setSelected(null);
			},
		});
	}

	return (
		<Screen>
			<TopBar
				actions={
					items.length > 0 && (
						<Button
							className="h-10 px-3"
							onPress={() => setSelected(selecting ? null : new Set())}
							variant="ghost"
						>
							{selecting ? "Done" : "Select"}
						</Button>
					)
				}
				title="Downloads"
			/>
			{items.length > 0 && (
				<Text className="px-4 pb-2 text-center text-sm text-muted-foreground">
					{summary}
				</Text>
			)}
			<SectionList
				contentContainerClassName="grow px-4"
				contentContainerStyle={{ paddingBottom: selecting ? 16 : endPadding }}
				keyExtractor={(item) => item.key}
				ListEmptyComponent={
					<EmptyState
						description="Download an album or playlist from its page to listen offline."
						icon="download"
						title="No downloads"
					/>
				}
				renderItem={({ item }) => {
					const isSelected = selecting
						? selectedItems.includes(item)
						: undefined;
					const onPress = () => {
						if (selecting) toggle(item.key);
						else if (item.playlist)
							router.push({
								pathname: "/playlist/[id]",
								params: { id: String(item.playlist.playlistId) },
							});
						else
							router.push({
								pathname: "/album/[id]",
								params: { id: item.album.albumId },
							});
					};
					return item.playlist ? (
						<PlaylistDownloadRow
							onPress={onPress}
							playlist={item.playlist}
							selected={isSelected}
							stats={item.stats}
						/>
					) : (
						<AlbumDownloadRow
							album={item.album}
							onPress={onPress}
							selected={isSelected}
							stats={item.stats}
						/>
					);
				}}
				renderSectionHeader={({ section }) =>
					// One kind of download needs no headings.
					sections.length > 1 ? <SectionHeader title={section.title} /> : null
				}
				sections={sections}
				stickySectionHeadersEnabled={false}
			/>
			{selecting && (
				<View
					className="flex-row gap-3 border-t border-border px-4 py-3"
					// Sits above the floating mini player.
					style={{ marginBottom: endPadding - 16 }}
				>
					<Button
						className="flex-1"
						onPress={() =>
							setSelected(
								allSelected
									? new Set()
									: new Set(items.map((item) => item.key)),
							)
						}
						variant="secondary"
					>
						{allSelected ? "Deselect all" : "Select all"}
					</Button>
					<Button
						className="flex-1"
						disabled={selectedItems.length === 0}
						icon="delete"
						onPress={confirmDelete}
						variant="destructive"
					>
						{selectedItems.length > 0
							? `Delete (${selectedItems.length})`
							: "Delete"}
					</Button>
				</View>
			)}
		</Screen>
	);
}

type RowProps = {
	stats: AlbumDownloadStats;
	/** Unset when the list is not selecting. */
	selected?: boolean;
	onPress: () => void;
};

function AlbumDownloadRow({
	album,
	...props
}: RowProps & { album: OfflineAlbum }) {
	const coverUri = useArtworkUri(getCover(album.cover.album));
	return (
		<DownloadRow
			{...props}
			artwork={
				<Artwork recyclingKey={album.albumId} size={52} uri={coverUri} />
			}
			status={getStatus(
				props.stats,
				album.kind === "played" ? "played track" : "track",
			)}
			subtitle={joinNames(album.credits) || "Unknown artist"}
			title={album.title}
		/>
	);
}

function PlaylistDownloadRow({
	playlist,
	...props
}: RowProps & { playlist: OfflinePlaylist }) {
	return (
		<DownloadRow
			{...props}
			artwork={<PlaylistCover entries={playlist.entries} size={52} />}
			status={getStatus(props.stats, "track")}
			subtitle="Playlist"
			title={playlist.name}
		/>
	);
}

type DownloadRowProps = RowProps & {
	artwork: ReactNode;
	title: string;
	subtitle: string;
	status: string;
};

function DownloadRow({
	artwork,
	title,
	subtitle,
	status,
	stats,
	selected,
	onPress,
}: DownloadRowProps) {
	const isSelecting = selected !== undefined;

	return (
		<ListRow
			accessibilityLabel={`${title}, ${subtitle}, ${status}`}
			accessibilityRole={isSelecting ? "checkbox" : "link"}
			accessibilityState={isSelecting ? { checked: selected } : undefined}
			leading={
				<View className="flex-row items-center gap-3">
					{isSelecting && (
						<View
							className={cn(
								"size-6 items-center justify-center rounded-full border-2",
								selected
									? "border-primary bg-primary"
									: "border-surface-strong",
							)}
						>
							{selected && (
								<Icon
									className="accent-primary-foreground"
									name="check"
									size={14}
								/>
							)}
						</View>
					)}
					{artwork}
				</View>
			}
			onPress={onPress}
			subtitle={subtitle}
			title={title}
			detail={
				<Text
					className={cn(
						"text-xs",
						stats.failed > 0 ? "text-destructive" : "text-muted-foreground",
					)}
					numberOfLines={1}
				>
					{status}
				</Text>
			}
		/>
	);
}
