import { openDatabaseSync } from "expo-sqlite";

export type TrackDownloadStatus =
	| "queued"
	| "downloading"
	| "downloaded"
	| "failed";

/**
 * The audio file downloaded for a Track. Tracks can share a FileObject, so the
 * file on disk is named after the FileObject and stored once.
 */
export type TrackDownload = {
	trackId: string;
	albumId: string;
	fileObjectId: string;
	uri: string;
	sizeInBytes: number;
	status: TrackDownloadStatus;
	error: string | null;
};

/**
 * `album` is a whole downloaded album; `played` holds only some of its tracks,
 * saved while playing or for downloaded playlists.
 */
export type OfflineAlbumKind = "album" | "played";

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
	CREATE TABLE IF NOT EXISTS offline_playlist (
		playlistId TEXT PRIMARY KEY NOT NULL,
		snapshot TEXT NOT NULL,
		downloadedAt INTEGER NOT NULL
	);
	-- Track downloads queued for playlists rather than saved while playing.
	CREATE TABLE IF NOT EXISTS playlist_track (
		trackId TEXT PRIMARY KEY NOT NULL
	);
	CREATE TABLE IF NOT EXISTS artwork (
		fileObjectId TEXT PRIMARY KEY NOT NULL,
		uri TEXT NOT NULL
	);
`);
