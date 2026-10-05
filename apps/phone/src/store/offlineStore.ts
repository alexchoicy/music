import { create } from "zustand";

import type { AlbumDetails } from "@/lib/album";
import type {
	ArtworkRow,
	OfflineAlbumKind,
	TrackDownloadRow,
} from "@/lib/offline/db";
import { db } from "@/lib/offline/db";

/** What the downloads list needs from a saved album snapshot. */
export type OfflineAlbum = Pick<
	AlbumDetails,
	| "title"
	| "type"
	| "releaseDate"
	| "totalTrackCount"
	| "totalDurationInMs"
	| "credits"
	| "cover"
> & {
	albumId: string;
	downloadedAt: number;
	kind: OfflineAlbumKind;
};

type OfflineState = {
	/** Albums saved for offline use, keyed by album id. */
	albums: Partial<Record<string, OfflineAlbum>>;
	tracks: Partial<Record<string, TrackDownloadRow>>;
	/** Download progress from 0 to 1, keyed by track id. Not persisted. */
	progress: Partial<Record<string, number>>;
	/** Local artwork URIs, keyed by FileObject id. */
	artwork: Partial<Record<string, string>>;
};

function loadState(): OfflineState {
	// Read only the fields the list needs instead of parsing whole snapshots.
	const albums = db.getAllSync<
		Omit<OfflineAlbum, "credits" | "cover"> & { credits: string; cover: string }
	>(
		`SELECT albumId, downloadedAt, kind,
			json_extract(snapshot, '$.title') AS title,
			json_extract(snapshot, '$.type') AS type,
			json_extract(snapshot, '$.releaseDate') AS releaseDate,
			json_extract(snapshot, '$.totalTrackCount') AS totalTrackCount,
			json_extract(snapshot, '$.totalDurationInMs') AS totalDurationInMs,
			json_extract(snapshot, '$.credits') AS credits,
			json_extract(snapshot, '$.cover') AS cover
		FROM offline_album`,
	);
	const tracks = db.getAllSync<TrackDownloadRow>(
		"SELECT * FROM track_download",
	);
	const artwork = db.getAllSync<ArtworkRow>("SELECT * FROM artwork");

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
		progress: {},
		artwork: Object.fromEntries(
			artwork.map((row) => [row.fileObjectId, row.uri]),
		),
	};
}

export const useOfflineStore = create<OfflineState>()(() => loadState());

/** Re-reads persisted download state after the database changes. */
export function reloadOfflineState() {
	useOfflineStore.setState(({ progress }) => ({ ...loadState(), progress }));
}
