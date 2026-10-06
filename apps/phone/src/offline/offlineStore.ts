import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { create } from "zustand";

import { getCover, isUnplayableExtension, joinNames } from "@/lib/music";
import type { AlbumTile } from "@/lib/music";
import type { AlbumDetails, FileObject } from "@/lib/schema";
import type { OfflineAlbumKind, TrackDownload } from "@/offline/db";
import { db } from "@/offline/db";

/** What lists need from a saved album snapshot. */
export type OfflineAlbum = Pick<
	AlbumDetails,
	"title" | "type" | "releaseDate" | "credits" | "cover"
> & {
	albumId: string;
	downloadedAt: number;
	kind: OfflineAlbumKind;
};

type OfflineState = {
	/** Saved albums, keyed by album id. */
	albums: Partial<Record<string, OfflineAlbum>>;
	/** Track downloads, keyed by track id. */
	tracks: Partial<Record<string, TrackDownload>>;
	/** Download progress from 0 to 1, keyed by track id. Not persisted. */
	progress: Partial<Record<string, number>>;
	/** Local artwork URIs, keyed by FileObject id. */
	artwork: Partial<Record<string, string>>;
};

function loadState(): Omit<OfflineState, "progress"> {
	// Reads only the fields lists need instead of parsing whole snapshots.
	const albums = db.getAllSync<
		Omit<OfflineAlbum, "credits" | "cover"> & { credits: string; cover: string }
	>(
		`SELECT albumId, downloadedAt, kind,
			json_extract(snapshot, '$.title') AS title,
			json_extract(snapshot, '$.type') AS type,
			json_extract(snapshot, '$.releaseDate') AS releaseDate,
			json_extract(snapshot, '$.credits') AS credits,
			json_extract(snapshot, '$.cover') AS cover
		FROM offline_album`,
	);
	const tracks = db.getAllSync<TrackDownload>("SELECT * FROM track_download");
	const artwork = db.getAllSync<{ fileObjectId: string; uri: string }>(
		"SELECT * FROM artwork",
	);

	return {
		albums: Object.fromEntries(
			albums.map((row) => [
				row.albumId,
				{
					...row,
					credits: JSON.parse(row.credits) as OfflineAlbum["credits"],
					cover: JSON.parse(row.cover) as OfflineAlbum["cover"],
				},
			]),
		),
		tracks: Object.fromEntries(tracks.map((row) => [row.trackId, row])),
		artwork: Object.fromEntries(
			artwork.map((row) => [row.fileObjectId, row.uri]),
		),
	};
}

export const useOfflineStore = create<OfflineState>()(() => ({
	...loadState(),
	progress: {},
}));

/** Re-reads persisted download state after the database changes. */
export function reloadOfflineState() {
	useOfflineStore.setState(loadState());
}

export function useIsOnline() {
	return useSyncExternalStore(
		(listener) => onlineManager.subscribe(listener),
		() => onlineManager.isOnline(),
	);
}

/** A finished download the phone can decode; DSF originals cannot play. */
export function isPlayableDownload(download: TrackDownload | undefined) {
	return (
		download?.status === "downloaded" &&
		!isUnplayableExtension(download.uri.split(".").at(-1) ?? "")
	);
}

/** Downloaded artwork, otherwise the remote URL that expo-image caches. */
export function resolveArtworkUri(file: FileObject | null | undefined) {
	return file
		? (useOfflineStore.getState().artwork[file.id] ?? file.url)
		: null;
}

export function useArtworkUri(file: FileObject | null | undefined) {
	const local = useOfflineStore((state) =>
		file ? state.artwork[file.id] : undefined,
	);
	return file ? (local ?? file.url) : null;
}

export type AlbumDownloadStats = {
	total: number;
	downloaded: number;
	failed: number;
	sizeInBytes: number;
};

export const emptyDownloadStats: AlbumDownloadStats = {
	total: 0,
	downloaded: 0,
	failed: 0,
	sizeInBytes: 0,
};

/** Track counts and downloaded size per album. */
export function getDownloadStats(
	tracks: OfflineState["tracks"],
): Partial<Record<string, AlbumDownloadStats>> {
	const stats: Partial<Record<string, AlbumDownloadStats>> = {};
	for (const track of Object.values(tracks)) {
		if (!track) continue;
		const album = (stats[track.albumId] ??= { ...emptyDownloadStats });
		album.total += 1;
		if (track.status === "failed") album.failed += 1;
		if (track.status === "downloaded") {
			album.downloaded += 1;
			album.sizeInBytes += track.sizeInBytes;
		}
	}
	return stats;
}

/** Downloaded albums with at least one finished track, as album tiles. */
export function getDownloadedTiles({
	albums,
	tracks,
}: Pick<OfflineState, "albums" | "tracks">) {
	const stats = getDownloadStats(tracks);
	return Object.values(albums)
		.filter(
			(album): album is OfflineAlbum =>
				!!album && (stats[album.albumId]?.downloaded ?? 0) > 0,
		)
		.map((album): AlbumTile => ({
			albumId: album.albumId,
			title: album.title,
			type: album.type,
			artists: joinNames(album.credits),
			cover:
				getCover(album.cover.discs.at(0)?.variants) ??
				getCover(album.cover.album),
			addedAt: album.downloadedAt,
		}));
}
