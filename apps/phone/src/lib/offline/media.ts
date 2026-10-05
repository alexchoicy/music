import type { components } from "@api/schema";
import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { isUnplayableExtension } from "@/lib/audio";
import type { TrackDownloadRow } from "@/lib/offline/db";
import type { OfflineAlbum } from "@/store/offlineStore";
import { useOfflineStore } from "@/store/offlineStore";

type FileObjectDetails = components["schemas"]["FileObjectDetails"];

export type TrackAvailability = "local" | "stream" | "unavailable";

/** A finished download the phone can decode; DSF originals cannot be played. */
export function isPlayableDownload(download: TrackDownloadRow | undefined) {
	return (
		download?.status === "downloaded" &&
		!isUnplayableExtension(download.uri.split(".").at(-1) ?? "")
	);
}

/** Where a track can play from right now; derived, never stored. */
export function getTrackAvailability(
	download: TrackDownloadRow | undefined,
	hasAudio: boolean,
	isOnline: boolean,
): TrackAvailability {
	if (download?.status === "downloaded") return "local";
	return hasAudio && isOnline ? "stream" : "unavailable";
}

export function useIsOnline() {
	return useSyncExternalStore(
		(listener) => onlineManager.subscribe(listener),
		() => onlineManager.isOnline(),
	);
}

/** Local URI for downloaded artwork, otherwise the remote URL cached by expo-image. */
export function resolveArtworkUri(
	file: FileObjectDetails | null | undefined,
	artwork: Partial<Record<string, string>>,
) {
	return file ? (artwork[file.id] ?? file.url) : null;
}

export function useArtworkUri(file: FileObjectDetails | null | undefined) {
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

/** Track counts and downloaded size per album. */
export function getAlbumDownloadStats(
	tracks: Partial<Record<string, TrackDownloadRow>>,
) {
	const stats: Partial<Record<string, AlbumDownloadStats>> = {};
	for (const track of Object.values(tracks)) {
		if (!track) continue;
		const album = (stats[track.albumId] ??= {
			total: 0,
			downloaded: 0,
			failed: 0,
			sizeInBytes: 0,
		});
		album.total += 1;
		if (track.status === "failed") album.failed += 1;
		if (track.status === "downloaded") {
			album.downloaded += 1;
			album.sizeInBytes += track.sizeInBytes;
		}
	}
	return stats;
}

const megabyte = 1024 * 1024;

export function formatFileSize(bytes: number) {
	if (bytes < megabyte) return `${Math.round(bytes / 1024)} KB`;
	if (bytes < 1024 * megabyte) {
		return `${(bytes / megabyte).toFixed(bytes < 10 * megabyte ? 1 : 0)} MB`;
	}
	return `${(bytes / (1024 * megabyte)).toFixed(1)} GB`;
}

/** A downloaded album shaped like a library list item. "Added" is when it was downloaded. */
export function toAlbumListItem(
	album: OfflineAlbum,
): components["schemas"]["AlbumListItem"] {
	const downloadedAt = new Date(album.downloadedAt).toISOString();
	return {
		albumId: album.albumId,
		title: album.title,
		type: album.type,
		releaseDate: album.releaseDate,
		createdAt: downloadedAt,
		updatedAt: downloadedAt,
		coverVariants: album.cover.album,
		discCovers: album.cover.discs,
		artists: [
			...new Map(
				album.credits.map((credit) => [
					String(credit.partyId),
					{ partyId: credit.partyId, name: credit.name },
				]),
			).values(),
		],
		trackCount: album.totalTrackCount,
		totalDurationInMs: album.totalDurationInMs,
	};
}
