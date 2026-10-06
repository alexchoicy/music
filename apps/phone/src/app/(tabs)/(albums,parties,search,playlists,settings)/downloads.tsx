import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirmDialog";
import { EmptyState } from "@/components/ui/emptyState";
import { TopBar } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { ListRow } from "@/components/ui/listRow";
import { Screen } from "@/components/ui/screen";
import { cn } from "@/lib/cn";
import { formatFileSize, plural } from "@/lib/format";
import { getCover, joinNames } from "@/lib/music";
import { removeAlbumDownloads } from "@/offline/downloads";
import type { AlbumDownloadStats, OfflineAlbum } from "@/offline/offlineStore";
import {
	emptyDownloadStats,
	getDownloadStats,
	useArtworkUri,
	useOfflineStore,
} from "@/offline/offlineStore";
import { useEndPadding } from "@/store/miniPlayerStore";

function getStatus(album: OfflineAlbum, stats: AlbumDownloadStats) {
	const tracks = plural(
		stats.total,
		album.kind === "played" ? "played track" : "track",
	);
	if (stats.downloaded + stats.failed < stats.total) {
		const failed = stats.failed > 0 ? ` · ${stats.failed} failed` : "";
		return `Downloading ${stats.downloaded} of ${tracks}${failed}`;
	}
	if (stats.failed > 0) return `${stats.failed} of ${tracks} failed`;
	return `${tracks} · ${formatFileSize(stats.sizeInBytes)}`;
}

export default function DownloadsScreen() {
	const albumMap = useOfflineStore((state) => state.albums);
	const tracks = useOfflineStore((state) => state.tracks);
	const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
	const selecting = selected !== null;
	const endPadding = useEndPadding(16);

	const albums = Object.values(albumMap)
		.filter((album) => album !== undefined)
		.sort((a, b) => b.downloadedAt - a.downloadedAt);
	const stats = getDownloadStats(tracks);
	const totalSize = Object.values(stats).reduce(
		(sum, album) => sum + (album?.sizeInBytes ?? 0),
		0,
	);
	// Albums removed while selected drop out.
	const selectedIds = albums
		.map((album) => album.albumId)
		.filter((id) => selected?.has(id));
	const allSelected = albums.length > 0 && selectedIds.length === albums.length;

	function toggle(albumId: string) {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(albumId)) next.delete(albumId);
			else next.add(albumId);
			return next;
		});
	}

	function confirmDelete() {
		const count = selectedIds.length;
		const size = selectedIds.reduce(
			(sum, id) => sum + (stats[id]?.sizeInBytes ?? 0),
			0,
		);
		confirm({
			title: `Delete ${plural(count, "download")}?`,
			message: `This frees up to ${formatFileSize(size)}. ${count === 1 ? "The album stays" : "The albums stay"} in your library.`,
			confirmLabel: "Delete",
			onConfirm: () => {
				removeAlbumDownloads(selectedIds);
				setSelected(null);
			},
		});
	}

	return (
		<Screen>
			<TopBar
				actions={
					albums.length > 0 && (
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
			{albums.length > 0 && (
				<Text className="px-4 pb-2 text-center text-sm text-muted-foreground">
					{plural(albums.length, "album")} · {formatFileSize(totalSize)}
				</Text>
			)}
			<FlatList
				contentContainerClassName="grow px-4"
				contentContainerStyle={{ paddingBottom: selecting ? 16 : endPadding }}
				data={albums}
				keyExtractor={(album) => album.albumId}
				ListEmptyComponent={
					<EmptyState
						description="Download an album from its page to listen offline."
						icon="download"
						title="No downloads"
					/>
				}
				renderItem={({ item }) => (
					<DownloadRow
						album={item}
						onPress={() =>
							selecting
								? toggle(item.albumId)
								: router.push({
										pathname: "/album/[id]",
										params: { id: item.albumId },
									})
						}
						selected={
							selecting ? selectedIds.includes(item.albumId) : undefined
						}
						stats={stats[item.albumId] ?? emptyDownloadStats}
					/>
				)}
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
									: new Set(albums.map((album) => album.albumId)),
							)
						}
						variant="secondary"
					>
						{allSelected ? "Deselect all" : "Select all"}
					</Button>
					<Button
						className="flex-1"
						disabled={selectedIds.length === 0}
						icon="delete"
						onPress={confirmDelete}
						variant="destructive"
					>
						{selectedIds.length > 0
							? `Delete (${selectedIds.length})`
							: "Delete"}
					</Button>
				</View>
			)}
		</Screen>
	);
}

type DownloadRowProps = {
	album: OfflineAlbum;
	stats: AlbumDownloadStats;
	/** Unset when the list is not selecting. */
	selected?: boolean;
	onPress: () => void;
};

function DownloadRow({ album, stats, selected, onPress }: DownloadRowProps) {
	const coverUri = useArtworkUri(getCover(album.cover.album));
	const artists = joinNames(album.credits) || "Unknown artist";
	const status = getStatus(album, stats);
	const isSelecting = selected !== undefined;

	return (
		<ListRow
			accessibilityLabel={`${album.title}, ${artists}, ${status}`}
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
					<Artwork recyclingKey={album.albumId} size={52} uri={coverUri} />
				</View>
			}
			onPress={onPress}
			subtitle={artists}
			title={album.title}
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
