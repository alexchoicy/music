import type { components } from "@api/schema";
import { Directory, File, Paths } from "expo-file-system";

import type { AlbumDetails } from "@/lib/album";
import { getAlbumCover } from "@/lib/album";
import { apiFetch } from "@/lib/api";
import {
	getAudioFile,
	getAudioVariant,
	getPreferredAudio,
	isUnplayableExtension,
} from "@/lib/audio";
import { isOnWifi, onWifiChange } from "@/lib/network";
import type { TrackDownloadRow } from "@/lib/offline/db";
import { db } from "@/lib/offline/db";
import { getPartyAvatar } from "@/lib/party";
import { reloadOfflineState, useOfflineStore } from "@/store/offlineStore";
import { useSettingsStore } from "@/store/settingsStore";

type FileObjectDetails = components["schemas"]["FileObjectDetails"];

const audioDirectory = new Directory(Paths.document, "offline", "audio");
const artworkDirectory = new Directory(Paths.document, "offline", "artwork");

function ensureDirectory(directory: Directory) {
	if (!directory.exists) directory.create({ intermediates: true });
}

function getFileName(file: FileObjectDetails) {
	return `${file.id}.${file.extension.replace(/^\./, "")}`;
}

/** Cover, disc covers, and credited Party avatars shown on an album page. */
function getAlbumArtwork(album: AlbumDetails) {
	const credits = [
		...album.credits,
		...album.discs.flatMap((disc) =>
			disc.tracks.flatMap((track) => track.credits),
		),
	];
	const files = [
		getAlbumCover(album.cover.album),
		...album.cover.discs.map((disc) => getAlbumCover(disc.variants)),
		...credits.map((credit) => getPartyAvatar(credit.avatar)),
	].filter((file): file is FileObjectDetails => !!file);

	return [...new Map(files.map((file) => [file.id, file])).values()];
}

function deleteFile(uri: string) {
	const file = new File(uri);
	if (file.exists) file.delete();
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
		deleteFile(row.uri);
	}
}

const controllers = new Map<string, AbortController>();
let queue = Promise.resolve();

function setProgress(trackId: string, value: number | null) {
	useOfflineStore.setState(({ progress }) => {
		const next = { ...progress };
		if (value === null) delete next[trackId];
		else next[trackId] = value;
		return { progress: next };
	});
}

/** Updates a download, unless the row was since switched to another file. */
function updateTrack(
	row: TrackDownloadRow,
	status: TrackDownloadRow["status"],
	values: { error?: string | null; sizeInBytes?: number } = {},
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

/** Downloads a FileObject to the target unless it is already on disk. */
async function fetchFile(
	fileObjectId: string,
	target: File,
	signal: AbortSignal,
	onProgress?: (progress: number) => void,
) {
	// Tracks that share a FileObject reuse the file that is already on disk.
	if (target.exists) return;
	const result = await apiFetch<string>(`/files/${fileObjectId}`, {
		headers: { Accept: "application/json" },
	});
	if (!result.ok) throw new Error(`Server responded with ${result.status}`);

	ensureDirectory(audioDirectory);
	await File.downloadFileAsync(result.data, target, {
		idempotent: true,
		signal,
		onProgress: ({ bytesWritten, totalBytes }) => {
			if (totalBytes > 0) onProgress?.(bytesWritten / totalBytes);
		},
	});
}

async function downloadTrack(row: TrackDownloadRow, signal: AbortSignal) {
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

async function downloadArtwork(file: FileObjectDetails, signal: AbortSignal) {
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
	const album = db.getFirstSync<{ snapshot: string }>(
		"SELECT snapshot FROM offline_album WHERE albumId = ?",
		albumId,
	);
	if (!album) return;

	for (const file of getAlbumArtwork(
		JSON.parse(album.snapshot) as AlbumDetails,
	)) {
		if (signal.aborted) return;
		await downloadArtwork(file, signal);
	}
	reloadOfflineState();

	// Re-read each time so tracks queued while this album runs are picked up.
	while (!signal.aborted) {
		const row = db.getFirstSync<TrackDownloadRow>(
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
	queue = queue
		.then(() => processAlbum(albumId, controller.signal))
		// A broken album must not stop the albums queued after it.
		.catch(() => {})
		.finally(() => {
			if (controllers.get(albumId) === controller) controllers.delete(albumId);
		});
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
			const file = getAudioFile(track, quality);
			if (!file) return [];
			// Keep files already downloaded in another quality of the same source.
			const sourceFileIds = Object.values(
				getPreferredAudio(track)?.file ?? {},
			).flatMap((variant) => (variant ? [variant.id] : []));
			return [{ trackId: String(track.trackId), file, sourceFileIds }];
		});

	db.withTransactionSync(() => {
		db.runSync(
			// Downloading the whole album also upgrades one that only had played tracks.
			"INSERT INTO offline_album (albumId, snapshot, downloadedAt, kind) VALUES (?, ?, ?, 'album') ON CONFLICT (albumId) DO UPDATE SET snapshot = excluded.snapshot, kind = 'album'",
			albumId,
			JSON.stringify(album),
			Date.now(),
		);
		db.runSync(
			`DELETE FROM track_download WHERE albumId = ? AND trackId NOT IN (${tracks.map(() => "?").join(",")})`,
			albumId,
			...tracks.map((track) => track.trackId),
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
				new File(audioDirectory, getFileName(file)).uri,
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
 * Lower-quality saves are upgraded on Wi‑Fi by `upgradePlayedTracks`.
 */
export function savePlayedTrack(
	album: AlbumDetails,
	trackId: string,
	file: FileObjectDetails,
) {
	const albumId = String(album.albumId);
	const { albums, tracks } = useOfflineStore.getState();
	// Whole-album downloads keep the quality the user chose for them.
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
			new File(audioDirectory, getFileName(file)).uri,
			Number(file.sizeInBytes),
		);
	});

	reloadOfflineState();
	enqueue(albumId);
}

type PlayedTrackRow = TrackDownloadRow & { snapshot: string };

/** Played-track rows with their album snapshot, parsed once per album. */
function getPlayedTracks(statuses: TrackDownloadRow["status"][]) {
	const rows = db.getAllSync<PlayedTrackRow>(
		`SELECT track_download.*, offline_album.snapshot FROM track_download JOIN offline_album USING (albumId) WHERE offline_album.kind = 'played' AND track_download.status IN (${statuses.map(() => "?").join(",")})`,
		...statuses,
	);
	const albums = new Map<string, AlbumDetails>();
	return rows.flatMap((row) => {
		let album = albums.get(row.albumId);
		if (!album) {
			album = JSON.parse(row.snapshot) as AlbumDetails;
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
 * On Wi‑Fi, replaces played tracks saved at a lower quality with the original.
 * The saved file stays until the original has fully downloaded.
 */
export function upgradePlayedTracks() {
	if (upgradeController) return;
	const controller = new AbortController();
	upgradeController = controller;
	queue = queue
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

/**
 * Off Wi‑Fi, stops upgrades and switches unfinished Original saves to the
 * mobile-data quality, so no Original download continues on mobile data.
 */
function stopWifiOnlyDownloads() {
	upgradeController?.abort();
	upgradeController = null;

	const restart = new Set<string>();
	for (const { row, audio } of getPlayedTracks(["queued", "downloading"])) {
		const file = getAudioVariant(
			audio,
			useSettingsStore.getState().streamingQuality,
		);
		if (file.id === row.fileObjectId) continue;
		db.runSync(
			"UPDATE track_download SET fileObjectId = ?, uri = ?, sizeInBytes = ?, status = 'queued', error = NULL WHERE trackId = ?",
			file.id,
			new File(audioDirectory, getFileName(file)).uri,
			Number(file.sizeInBytes),
			row.trackId,
		);
		restart.add(row.albumId);
	}
	for (const albumId of restart) {
		controllers.get(albumId)?.abort();
		controllers.delete(albumId);
		enqueue(albumId);
	}
	if (restart.size > 0) {
		deleteUnreferencedFiles();
		reloadOfflineState();
	}
}

let isAutoSaveStarted = false;

/** Starts upgrading saved tracks on Wi‑Fi and stopping Wi‑Fi-only work off it. */
export function startPlayedTrackUpgrades() {
	if (isAutoSaveStarted) return;
	isAutoSaveStarted = true;

	const sync = () => {
		if (!isOnWifi()) {
			stopWifiOnlyDownloads();
		} else if (useSettingsStore.getState().savePlayedTracks) {
			upgradePlayedTracks();
		} else {
			upgradeController?.abort();
			upgradeController = null;
		}
	};
	onWifiChange(sync);
	useSettingsStore.subscribe((settings, prev) => {
		if (settings.savePlayedTracks !== prev.savePlayedTracks) sync();
	});
	sync();
}

/** Keeps a saved album in sync with newer details from the server. */
export function syncSavedAlbum(album: AlbumDetails) {
	const albumId = String(album.albumId);
	const saved = useOfflineStore.getState().albums[albumId];
	if (!saved) return;
	if (saved.kind === "album") {
		downloadAlbum(album);
		return;
	}

	// Played tracks stay as they are; only drop tracks the album no longer has.
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
			`DELETE FROM track_download WHERE albumId = ? AND trackId NOT IN (${trackIds.map(() => "?").join(",")})`,
			albumId,
			...trackIds,
		);
	});
	deleteUnreferencedFiles();
	reloadOfflineState();
}

/** Retries tracks of an album that failed or were interrupted. */
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
	for (const albumId of albumIds) {
		controllers.get(albumId)?.abort();
		controllers.delete(albumId);
	}

	db.withTransactionSync(() => {
		for (const albumId of albumIds) {
			db.runSync("DELETE FROM offline_album WHERE albumId = ?", albumId);
			db.runSync("DELETE FROM track_download WHERE albumId = ?", albumId);
		}
	});

	deleteUnreferencedFiles();
	reloadOfflineState();
}

/** Resumes downloads that were queued or running when the app last closed. */
export function resumeDownloads() {
	const albums = db.getAllSync<{ albumId: string }>(
		"SELECT DISTINCT albumId FROM track_download WHERE status IN ('queued', 'downloading')",
	);
	for (const { albumId } of albums) enqueue(albumId);
}

/** Returns the saved album when its details cannot be fetched. */
export function getOfflineAlbum(albumId: string) {
	const row = db.getFirstSync<{ snapshot: string }>(
		"SELECT snapshot FROM offline_album WHERE albumId = ?",
		albumId,
	);
	return row ? (JSON.parse(row.snapshot) as AlbumDetails) : undefined;
}
