import { openDatabaseSync } from "expo-sqlite";

export type TrackDownloadStatus =
	| "queued"
	| "downloading"
	| "downloaded"
	| "failed";

/**
 * The audio file downloaded for a Track. Several Tracks can share one FileObject,
 * so the file itself is stored once per FileObject.
 */
export type TrackDownloadRow = {
	trackId: string;
	albumId: string;
	fileObjectId: string;
	uri: string;
	sizeInBytes: number;
	status: TrackDownloadStatus;
	error: string | null;
};

/** `album` is a whole album the user downloaded; `played` holds only tracks saved while playing on Wi‑Fi. */
export type OfflineAlbumKind = "album" | "played";

export type ArtworkRow = {
	fileObjectId: string;
	uri: string;
};

export const db = openDatabaseSync("offline.db");

db.execSync(`
	PRAGMA journal_mode = WAL;
	CREATE TABLE IF NOT EXISTS offline_album (
		albumId TEXT PRIMARY KEY NOT NULL,
		snapshot TEXT NOT NULL,
		downloadedAt INTEGER NOT NULL,
		kind TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS track_download (
		trackId TEXT PRIMARY KEY NOT NULL,
		albumId TEXT NOT NULL,
		fileObjectId TEXT NOT NULL,
		uri TEXT NOT NULL,
		sizeInBytes INTEGER NOT NULL,
		status TEXT NOT NULL,
		error TEXT
	);
	CREATE INDEX IF NOT EXISTS track_download_album ON track_download (albumId);
	CREATE TABLE IF NOT EXISTS artwork (
		fileObjectId TEXT PRIMARY KEY NOT NULL,
		uri TEXT NOT NULL
	);
`);
