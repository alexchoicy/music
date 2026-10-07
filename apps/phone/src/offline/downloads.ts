import { Directory, File, Paths } from "expo-file-system";

import { api } from "@/lib/api";
import {
	getAvatar,
	getCover,
	getPlaybackFile,
	getPreferredAudio,
	isUnplayableExtension,
} from "@/lib/music";
import { isOnWifi, onWifiChange } from "@/lib/network";
import type { AlbumDetails, FileObject } from "@/lib/schema";
import type { TrackDownload } from "@/offline/db";
import { db } from "@/offline/db";
import { reloadOfflineState, useOfflineStore } from "@/offline/offlineStore";
import { getStreamingQuality, useSettingsStore } from "@/store/settingsStore";

const audioDirectory = new Directory(Paths.document, "offline", "audio");
const artworkDirectory = new Directory(Paths.document, "offline", "artwork");

function ensureDirectory(directory: Directory) {
	if (!directory.exists) directory.create({ intermediates: true });
}

function getFileName(file: FileObject) {
	return `${file.id}.${file.extension.replace(/^\./, "")}`;
}

function getAudioUri(file: FileObject) {
	return new File(audioDirectory, getFileName(file)).uri;
}

function placeholders(values: unknown[]) {
	return values.map(() => "?").join(",");
}

/** The cover, disc covers, and credited Party avatars shown on an album page. */
function getAlbumArtwork(album: AlbumDetails) {
	const credits = [
		...album.credits,
		...album.discs.flatMap((disc) =>
			disc.tracks.flatMap((track) => track.credits),
		),
	];
	const files = [
		getCover(album.cover.album),
		...album.cover.discs.map((disc) => getCover(disc.variants)),
		...credits.map((credit) => getAvatar(credit.avatar)),
	].filter((file) => file !== null);

	return [...new Map(files.map((file) => [file.id, file])).values()];
}

function readSnapshot(albumId: string) {
	const row = db.getFirstSync<{ snapshot: string }>(
		"SELECT snapshot FROM offline_album WHERE albumId = ?",
		albumId,
	);
	return row ? (JSON.parse(row.snapshot) as AlbumDetails) : undefined;
}

/** Deletes audio and artwork that no saved album references anymore. */
function deleteUnreferencedFiles() {
	const audioUris = new Set(
		db
			.getAllSync<{ uri: string }>("SELECT uri FROM track_download")
			.map((row) => row.uri),
	);
	if (audioDirectory.exists) {
		for (const entry of audioDirectory.list()) {
			if (entry instanceof File && !audioUris.has(entry.uri)) entry.delete();
		}
	}

	const artworkIds = new Set(
		db
			.getAllSync<{ snapshot: string }>("SELECT snapshot FROM offline_album")
			.flatMap((row) =>
				getAlbumArtwork(JSON.parse(row.snapshot) as AlbumDetails).map(
					(file) => file.id,
				),
			),
	);
	for (const row of db.getAllSync<{ fileObjectId: string; uri: string }>(
		"SELECT fileObjectId, uri FROM artwork",
	)) {
		if (artworkIds.has(row.fileObjectId)) continue;
		db.runSync("DELETE FROM artwork WHERE fileObjectId = ?", row.fileObjectId);
		const file = new File(row.uri);
		if (file.exists) file.delete();
	}
}

const controllers = new Map<string, AbortController>();
let work = Promise.resolve();

function setProgress(trackId: string, value: number | null) {
	useOfflineStore.setState(({ progress }) => {
		const next = { ...progress };
		if (value === null) delete next[trackId];
		else next[trackId] = value;
		return { progress: next };
	});
}

/** Updates a download, unless the row has since switched to another file. */
function updateTrack(
	row: TrackDownload,
	status: TrackDownload["status"],
	values: { error?: string; sizeInBytes?: number } = {},
) {
	db.runSync(
		"UPDATE track_download SET status = ?, error = ?, sizeInBytes = COALESCE(?, sizeInBytes) WHERE trackId = ? AND fileObjectId = ?",
		status,
		values.error ?? null,
		values.sizeInBytes ?? null,
		row.trackId,
		row.fileObjectId,
	);
	reloadOfflineState();
}

/** Downloads a FileObject unless it is already on disk. */
async function fetchFile(
	fileObjectId: string,
	target: File,
	signal: AbortSignal,
	onProgress?: (progress: number) => void,
) {
	// Tracks that share a FileObject reuse the file already on disk.
	if (target.exists) return;
	const url = await api<string>(`/files/${fileObjectId}`, { signal });

	ensureDirectory(audioDirectory);
	await File.downloadFileAsync(url, target, {
		idempotent: true,
		signal,
		onProgress: ({ bytesWritten, totalBytes }) => {
			if (totalBytes > 0) onProgress?.(bytesWritten / totalBytes);
		},
	});
}

async function downloadTrack(row: TrackDownload, signal: AbortSignal) {
	const target = new File(row.uri);
	updateTrack(row, "downloading");

	try {
		await fetchFile(row.fileObjectId, target, signal, (progress) =>
			setProgress(row.trackId, progress),
		);
		updateTrack(row, "downloaded", { sizeInBytes: target.size });
	} catch (error) {
		// Removing the album already cleared its rows.
		if (signal.aborted) return;
		updateTrack(row, "failed", {
			error: error instanceof Error ? error.message : "Download failed",
		});
	} finally {
		setProgress(row.trackId, null);
	}
}

async function downloadArtwork(file: FileObject, signal: AbortSignal) {
	if (useOfflineStore.getState().artwork[file.id]) return;

	const target = new File(artworkDirectory, getFileName(file));
	try {
		if (!target.exists) {
			ensureDirectory(artworkDirectory);
			await File.downloadFileAsync(file.url, target, {
				idempotent: true,
				signal,
			});
		}
		db.runSync(
			"INSERT OR REPLACE INTO artwork (fileObjectId, uri) VALUES (?, ?)",
			file.id,
			target.uri,
		);
	} catch {
		// Artwork is optional offline; screens fall back to the remote URL.
	}
}

async function processAlbum(albumId: string, signal: AbortSignal) {
	const album = readSnapshot(albumId);
	if (!album) return;

	for (const file of getAlbumArtwork(album)) {
		if (signal.aborted) return;
		await downloadArtwork(file, signal);
	}
	reloadOfflineState();

	// Re-read each time so tracks queued while this album runs are picked up.
	while (!signal.aborted) {
		const row = db.getFirstSync<TrackDownload>(
			"SELECT * FROM track_download WHERE albumId = ? AND status IN ('queued', 'downloading') LIMIT 1",
			albumId,
		);
		if (!row) return;
		await downloadTrack(row, signal);
	}
}

/** Downloads albums one at a time so a large album does not starve the others. */
function enqueue(albumId: string) {
	if (controllers.has(albumId)) return;

	const controller = new AbortController();
	controllers.set(albumId, controller);
	work = work
		.then(() => processAlbum(albumId, controller.signal))
		// A broken album must not stop the albums queued after it.
		.catch(() => {})
		.finally(() => {
			if (controllers.get(albumId) === controller) controllers.delete(albumId);
		});
}

function cancel(albumId: string) {
	controllers.get(albumId)?.abort();
	controllers.delete(albumId);
}

/**
 * Saves an album snapshot and queues its artwork and preferred audio files.
 * Calling it again with newer details adds new tracks and drops removed ones.
 */
export function downloadAlbum(album: AlbumDetails) {
	const albumId = String(album.albumId);
	const existing = useOfflineStore.getState().tracks;
	const quality = useSettingsStore.getState().downloadQuality;
	const tracks = album.discs
		.flatMap((disc) => disc.tracks)
		.flatMap((track) => {
			const audio = getPreferredAudio(track);
			if (!audio) return [];
			// An unplayable original, e.g. DSF, falls back to Opus like streaming.
			const file = getPlaybackFile(audio, quality);
			if (isUnplayableExtension(file.extension)) return [];
			// Playable files already downloaded at another quality of the same source are kept.
			const sourceFileIds = Object.values(audio.file).flatMap((variant) =>
				variant && !isUnplayableExtension(variant.extension)
					? [variant.id]
					: [],
			);
			return [{ trackId: String(track.trackId), file, sourceFileIds }];
		});
	const trackIds = tracks.map((track) => track.trackId);

	db.withTransactionSync(() => {
		db.runSync(
			// Downloading the whole album also upgrades one that only had played tracks.
			"INSERT INTO offline_album (albumId, snapshot, downloadedAt, kind) VALUES (?, ?, ?, 'album') ON CONFLICT (albumId) DO UPDATE SET snapshot = excluded.snapshot, kind = 'album'",
			albumId,
			JSON.stringify(album),
			Date.now(),
		);
		db.runSync(
			`DELETE FROM track_download WHERE albumId = ? AND trackId NOT IN (${placeholders(trackIds)})`,
			albumId,
			...trackIds,
		);
		for (const { trackId, file, sourceFileIds } of tracks) {
			const current = existing[trackId];
			if (
				current?.status === "downloaded" &&
				sourceFileIds.includes(current.fileObjectId)
			)
				continue;
			db.runSync(
				"INSERT OR REPLACE INTO track_download (trackId, albumId, fileObjectId, uri, sizeInBytes, status, error) VALUES (?, ?, ?, ?, ?, 'queued', NULL)",
				trackId,
				albumId,
				file.id,
				getAudioUri(file),
				Number(file.sizeInBytes),
			);
		}
	});

	deleteUnreferencedFiles();
	reloadOfflineState();
	enqueue(albumId);
}

/**
 * Saves a played track for offline use, downloading the file that is streaming.
 * Saves below Original are upgraded on Wi‑Fi.
 */
export function savePlayedTrack(
	album: AlbumDetails,
	trackId: string,
	file: FileObject,
) {
	const albumId = String(album.albumId);
	const { albums, tracks } = useOfflineStore.getState();
	// Whole-album downloads keep the quality chosen for them.
	if (albums[albumId]?.kind === "album") return;
	// Saved or in progress; a failed save is retried.
	const current = tracks[trackId];
	if (current && current.status !== "failed") return;

	db.withTransactionSync(() => {
		db.runSync(
			"INSERT INTO offline_album (albumId, snapshot, downloadedAt, kind) VALUES (?, ?, ?, 'played') ON CONFLICT (albumId) DO UPDATE SET snapshot = excluded.snapshot",
			albumId,
			JSON.stringify(album),
			Date.now(),
		);
		db.runSync(
			"INSERT OR REPLACE INTO track_download (trackId, albumId, fileObjectId, uri, sizeInBytes, status, error) VALUES (?, ?, ?, ?, ?, 'queued', NULL)",
			trackId,
			albumId,
			file.id,
			getAudioUri(file),
			Number(file.sizeInBytes),
		);
	});

	reloadOfflineState();
	enqueue(albumId);
}

/** Played-track rows with the preferred source from their album snapshot. */
function getPlayedTracks(statuses: TrackDownload["status"][]) {
	const rows = db.getAllSync<TrackDownload & { snapshot: string }>(
		`SELECT track_download.*, offline_album.snapshot FROM track_download JOIN offline_album USING (albumId) WHERE offline_album.kind = 'played' AND track_download.status IN (${placeholders(statuses)})`,
		...statuses,
	);
	const albums = new Map<string, AlbumDetails>();
	return rows.flatMap(({ snapshot, ...row }) => {
		let album = albums.get(row.albumId);
		if (!album) {
			album = JSON.parse(snapshot) as AlbumDetails;
			albums.set(row.albumId, album);
		}
		const track = album.discs
			.flatMap((disc) => disc.tracks)
			.find((item) => String(item.trackId) === row.trackId);
		const audio = track && getPreferredAudio(track);
		return audio ? [{ row, audio }] : [];
	});
}

let upgradeController: AbortController | null = null;

/**
 * On Wi‑Fi, replaces played tracks saved below Original with the original.
 * The saved file stays until the original has fully downloaded.
 */
function upgradePlayedTracks() {
	if (upgradeController) return;
	const controller = new AbortController();
	upgradeController = controller;
	work = work
		.then(async () => {
			for (const { row, audio } of getPlayedTracks(["downloaded"])) {
				const original = audio.file.original;
				if (
					controller.signal.aborted ||
					original.id === row.fileObjectId ||
					// The phone cannot play DSF originals, so Opus stays.
					isUnplayableExtension(original.extension)
				)
					continue;

				const target = new File(audioDirectory, getFileName(original));
				try {
					await fetchFile(original.id, target, controller.signal);
				} catch {
					continue;
				}
				db.runSync(
					"UPDATE track_download SET fileObjectId = ?, uri = ?, sizeInBytes = ? WHERE trackId = ? AND fileObjectId = ? AND status = 'downloaded'",
					original.id,
					target.uri,
					target.size,
					row.trackId,
					row.fileObjectId,
				);
				deleteUnreferencedFiles();
				reloadOfflineState();
			}
		})
		.catch(() => {})
		.finally(() => {
			if (upgradeController === controller) upgradeController = null;
		});
}

function stopUpgrades() {
	upgradeController?.abort();
	upgradeController = null;
}

/**
 * Off Wi‑Fi, stops upgrades and switches unfinished Original saves to the
 * streaming quality, so no Original download continues on mobile data.
 */
function stopWifiOnlyDownloads() {
	stopUpgrades();

	const restart = new Set<string>();
	// Off Wi‑Fi, this is the mobile-data quality.
	const quality = getStreamingQuality();
	for (const { row, audio } of getPlayedTracks(["queued", "downloading"])) {
		const file = getPlaybackFile(audio, quality);
		if (file.id === row.fileObjectId) continue;
		db.runSync(
			"UPDATE track_download SET fileObjectId = ?, uri = ?, sizeInBytes = ?, status = 'queued', error = NULL WHERE trackId = ?",
			file.id,
			getAudioUri(file),
			Number(file.sizeInBytes),
			row.trackId,
		);
		restart.add(row.albumId);
	}
	for (const albumId of restart) {
		cancel(albumId);
		enqueue(albumId);
	}
	if (restart.size > 0) {
		deleteUnreferencedFiles();
		reloadOfflineState();
	}
}

let isStarted = false;

/** Resumes unfinished downloads and keeps played-track saves in step with Wi‑Fi. */
export function startDownloads() {
	for (const { albumId } of db.getAllSync<{ albumId: string }>(
		"SELECT DISTINCT albumId FROM track_download WHERE status IN ('queued', 'downloading')",
	)) {
		enqueue(albumId);
	}

	if (isStarted) return;
	isStarted = true;
	const sync = () => {
		if (!isOnWifi()) stopWifiOnlyDownloads();
		else if (useSettingsStore.getState().savePlayedTracks)
			upgradePlayedTracks();
		else stopUpgrades();
	};
	onWifiChange(sync);
	useSettingsStore.subscribe((settings, prev) => {
		if (settings.savePlayedTracks !== prev.savePlayedTracks) sync();
	});
	sync();
}

/** Keeps a saved album in step with newer details from the server. */
export function syncSavedAlbum(album: AlbumDetails) {
	const albumId = String(album.albumId);
	const saved = useOfflineStore.getState().albums[albumId];
	if (!saved) return;
	if (saved.kind === "album") {
		downloadAlbum(album);
		return;
	}

	// Played tracks stay as they are; only tracks the album no longer has are dropped.
	const trackIds = album.discs.flatMap((disc) =>
		disc.tracks.map((track) => String(track.trackId)),
	);
	db.withTransactionSync(() => {
		db.runSync(
			"UPDATE offline_album SET snapshot = ? WHERE albumId = ?",
			JSON.stringify(album),
			albumId,
		);
		db.runSync(
			`DELETE FROM track_download WHERE albumId = ? AND trackId NOT IN (${placeholders(trackIds)})`,
			albumId,
			...trackIds,
		);
	});
	deleteUnreferencedFiles();
	reloadOfflineState();
}

/** Retries the tracks of an album that failed. */
export function retryAlbumDownload(albumId: string) {
	db.runSync(
		"UPDATE track_download SET status = 'queued', error = NULL WHERE albumId = ? AND status = 'failed'",
		albumId,
	);
	reloadOfflineState();
	enqueue(albumId);
}

/** Cancels and deletes downloaded albums, keeping files other albums still use. */
export function removeAlbumDownloads(albumIds: string[]) {
	for (const albumId of albumIds) cancel(albumId);

	db.withTransactionSync(() => {
		for (const albumId of albumIds) {
			db.runSync("DELETE FROM offline_album WHERE albumId = ?", albumId);
			db.runSync("DELETE FROM track_download WHERE albumId = ?", albumId);
		}
	});

	deleteUnreferencedFiles();
	reloadOfflineState();
}

/** The saved album, used when its details cannot be fetched. */
export const getOfflineAlbum = readSnapshot;
