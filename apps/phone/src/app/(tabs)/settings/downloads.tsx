import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/ui/detailHeader";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { getAlbumCover } from "@/lib/album";
import { cn } from "@/lib/cn";
import { useClearTabHistory } from "@/lib/navigation";
import { removeAlbumDownloads } from "@/lib/offline/downloads";
import type { AlbumDownloadStats } from "@/lib/offline/media";
import {
	formatFileSize,
	getAlbumDownloadStats,
	useArtworkUri,
} from "@/lib/offline/media";
import type { OfflineAlbum } from "@/store/offlineStore";
import { useOfflineStore } from "@/store/offlineStore";

const emptyStats: AlbumDownloadStats = {
	total: 0,
	downloaded: 0,
	failed: 0,
	sizeInBytes: 0,
};

function getStatus(album: OfflineAlbum, stats: AlbumDownloadStats) {
	const tracks = `${stats.total} ${album.kind === "played" ? "played " : ""}${stats.total === 1 ? "track" : "tracks"}`;
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
	const clearTabHistory = useClearTabHistory();
	const [selecting, setSelecting] = useState(false);
	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

	const albums = Object.values(albumMap)
		.filter((album): album is OfflineAlbum => !!album)
		.sort((a, b) => b.downloadedAt - a.downloadedAt);
	const stats = getAlbumDownloadStats(tracks);
	// Drop albums that were removed while selected.
	const selectedIds = albums
		.map((album) => album.albumId)
		.filter((id) => selected.has(id));
	const allSelected = albums.length > 0 && selectedIds.length === albums.length;

	function openAlbum(albumId: string) {
		clearTabHistory("albums");
		router.push(
			{ pathname: "/albums/[id]", params: { id: albumId } },
			{ withAnchor: true },
		);
	}

	function stopSelecting() {
		setSelecting(false);
		setSelected(new Set());
	}

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
		Alert.alert(
			`Delete ${count} ${count === 1 ? "download" : "downloads"}?`,
			`This frees up to ${formatFileSize(size)}. ${count === 1 ? "The album stays" : "The albums stay"} in your library.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						removeAlbumDownloads(selectedIds);
						stopSelecting();
					},
				},
			],
		);
	}

	return (
		<Screen>
			<DetailHeader
				action={
					albums.length > 0 && (
						<Button
							onPress={selecting ? stopSelecting : () => setSelecting(true)}
							variant="ghost"
						>
							{selecting ? "Done" : "Select"}
						</Button>
					)
				}
			/>
			<View className="gap-1 px-4 pt-1 pb-3">
				<Text
					accessibilityRole="header"
					className="text-xl font-semibold text-foreground"
				>
					Downloads
				</Text>
				{albums.length > 0 && (
					<Text className="text-sm text-muted-foreground">
						{albums.length} {albums.length === 1 ? "album" : "albums"} ·{" "}
						{formatFileSize(
							Object.values(stats).reduce(
								(sum, album) => sum + (album?.sizeInBytes ?? 0),
								0,
							),
						)}
					</Text>
				)}
			</View>
			{albums.length === 0 ? (
				<EmptyState
					description="Download an album from its page to listen offline."
					title="No downloads"
				/>
			) : (
				<FlatList
					contentContainerClassName="px-4 pb-4"
					data={albums}
					keyExtractor={(album) => album.albumId}
					renderItem={({ item }) => (
						<DownloadRow
							album={item}
							onPress={() =>
								selecting ? toggle(item.albumId) : openAlbum(item.albumId)
							}
							selected={selecting ? selected.has(item.albumId) : undefined}
							stats={stats[item.albumId] ?? emptyStats}
						/>
					)}
				/>
			)}
			{selecting && (
				<View className="flex-row gap-2 border-t border-border px-4 py-3">
					<Button
						className="flex-1"
						onPress={() =>
							setSelected(
								allSelected
									? new Set()
									: new Set(albums.map((album) => album.albumId)),
							)
						}
						variant="outline"
					>
						{allSelected ? "Deselect all" : "Select all"}
					</Button>
					<Button
						className="flex-1"
						disabled={selectedIds.length === 0}
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
	/** Undefined when the list is not in selection mode. */
	selected?: boolean;
	onPress: () => void;
};

function DownloadRow({ album, stats, selected, onPress }: DownloadRowProps) {
	const coverUrl = useArtworkUri(getAlbumCover(album.cover.album));
	const artists =
		[...new Set(album.credits.map((credit) => credit.name))].join(", ") ||
		"Unknown artist";
	const status = getStatus(album, stats);
	const isSelecting = selected !== undefined;

	return (
		<Pressable
			accessibilityLabel={`${album.title}, ${artists}, ${status}`}
			accessibilityRole={isSelecting ? "checkbox" : "link"}
			accessibilityState={isSelecting ? { checked: selected } : undefined}
			className="min-h-16 flex-row items-center gap-3 py-2 active:opacity-70"
			onPress={onPress}
		>
			{isSelecting && (
				<View
					className={cn(
						"size-6 items-center justify-center rounded-full border-2",
						selected ? "border-primary bg-primary" : "border-muted-foreground",
					)}
				>
					{selected && (
						<Icon
							className="accent-primary-foreground"
							name={{ ios: "checkmark", android: "check", web: "check" }}
							size={14}
						/>
					)}
				</View>
			)}
			<View className="size-12 overflow-hidden rounded-md bg-muted">
				{coverUrl ? (
					<Image
						contentFit="cover"
						recyclingKey={album.albumId}
						source={coverUrl}
						style={{ width: "100%", height: "100%" }}
					/>
				) : (
					<View className="flex-1 items-center justify-center">
						<Icon
							className="accent-muted-foreground"
							name={{ ios: "opticaldisc", android: "album", web: "album" }}
							size={20}
						/>
					</View>
				)}
			</View>
			<View className="flex-1 gap-0.5">
				<Text className="text-sm font-medium text-foreground" numberOfLines={1}>
					{album.title}
				</Text>
				<Text className="text-xs text-muted-foreground" numberOfLines={1}>
					{artists}
				</Text>
				<Text
					className={cn(
						"text-xs",
						stats.failed > 0 ? "text-destructive" : "text-muted-foreground",
					)}
					numberOfLines={1}
				>
					{status}
				</Text>
			</View>
		</Pressable>
	);
}
