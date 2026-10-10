import type {
	AlbumEditDetails,
	AlbumEditTrack,
	UpdateAlbumTracksRequest,
} from "#/lib/queries/albumEdit.queries";

export type TrackDraft = {
	id: string;
	trackId: number;
	title: string;
	durationInMs: number;
	contentType: AlbumEditTrack["contentType"];
	versionType: AlbumEditTrack["versionType"];
	languageId: number | null;
	artistIds: number[];
	otherAlbumCount: number;
};

export type DiscDraft = {
	albumDiscId: number;
	discNumber: number;
	subtitle: string;
};

export type TracksDraft = {
	discs: DiscDraft[];
	// Keyed by disc id so tracks can be dragged between discs
	tracksByDisc: Record<string, TrackDraft[]>;
};

export function discKey(albumDiscId: number) {
	return `disc-${albumDiscId}`;
}

export function toTracksDraft(album: AlbumEditDetails): TracksDraft {
	const tracksByDisc: Record<string, TrackDraft[]> = {};

	for (const disc of album.discs) {
		tracksByDisc[discKey(Number(disc.albumDiscId))] = disc.tracks.map(
			(track) => ({
				id: `track-${track.trackId}`,
				trackId: Number(track.trackId),
				title: track.title,
				durationInMs: Number(track.durationInMs),
				contentType: track.contentType,
				versionType: track.versionType,
				languageId: track.languageId == null ? null : Number(track.languageId),
				artistIds: track.artistIds.map(Number),
				otherAlbumCount: Number(track.otherAlbumCount),
			}),
		);
	}

	return {
		discs: album.discs.map((disc) => ({
			albumDiscId: Number(disc.albumDiscId),
			discNumber: Number(disc.discNumber),
			subtitle: disc.subtitle,
		})),
		tracksByDisc,
	};
}

export function toTracksRequest(
	draft: TracksDraft,
	version: AlbumEditDetails["version"],
): UpdateAlbumTracksRequest {
	return {
		version,
		discs: draft.discs.map((disc) => ({
			albumDiscId: disc.albumDiscId,
			subtitle: disc.subtitle,
			tracks: (draft.tracksByDisc[discKey(disc.albumDiscId)] ?? []).map(
				(track) => ({
					trackId: track.trackId,
					title: track.title.trim(),
					contentType: track.contentType,
					versionType: track.versionType,
					languageId: track.languageId,
					artistIds: track.artistIds,
				}),
			),
		})),
	};
}
