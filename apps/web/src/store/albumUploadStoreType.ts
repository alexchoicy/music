import type { IAudioMetadata } from "music-metadata";

import type { components } from "#/data/APIschema";

type CreateAlbumRequest = components["schemas"]["CreateAlbumRequest"];
type AlbumDiscRequest = components["schemas"]["AlbumDiscRequest"];
type AlbumImageRequest = components["schemas"]["AlbumImageRequest"];
type AlbumTrackRequest = components["schemas"]["AlbumTrackRequest"];
type PartyItem = components["schemas"]["PartyItems"];

export type LocalFileBlake3Hash = string;
export type AlbumLocalId = string;
export type DiscLocalId = string;
export type TrackLocalId = string;
export type CoverAssetBlake3Hash = string;
export type AlbumUploadStatus = "idle" | "creating" | "uploading";
export type AlbumMatchingKey = string;

export type ProcessedUploadFile = {
	blake3Hash: LocalFileBlake3Hash;
	file: File;
	metadata: IAudioMetadata;
};

export type CoverAsset = {
	blake3Hash: CoverAssetBlake3Hash;
	file: File;
	imageRequest: AlbumImageRequest;
	localURL: string;
};

export type AlbumDraft = Omit<CreateAlbumRequest, "image" | "discs"> & {
	localId: AlbumLocalId;
	matchingKey: AlbumMatchingKey;
	unsolvedCredits: string[];
	hasVariousArtists: boolean;
	coverAssetIdByHash: CoverAssetBlake3Hash | null;
	discIds: DiscLocalId[];
};

export type DiscDraft = Omit<AlbumDiscRequest, "image" | "tracks"> & {
	localId: DiscLocalId;
	albumId: AlbumLocalId;
	coverAssetId: CoverAssetBlake3Hash | null;
	trackIds: TrackLocalId[];
};

export type TrackDraft = AlbumTrackRequest & {
	localId: TrackLocalId;
	albumId: AlbumLocalId;
	discId: DiscLocalId;
	unsolvedCredits: string[];
	hasVariousArtists: boolean;
};

export type AlbumUploadState = {
	filesById: Record<LocalFileBlake3Hash, ProcessedUploadFile>;
	coverAssetsIdByHash: Record<CoverAssetBlake3Hash, CoverAsset>;
	albumOrder: AlbumLocalId[];
	albumsById: Record<AlbumLocalId, AlbumDraft>;
	albumsByMatchingKey: Record<AlbumMatchingKey, AlbumLocalId>;
	discsById: Record<DiscLocalId, DiscDraft>;
	tracksById: Record<TrackLocalId, TrackDraft>;
	isProcessing: boolean;
	submitStatus: AlbumUploadStatus;
	lastError: string | null;
};

export type AddDroppedFilesResult = {
	processedFileNames: string[];
	ignoredFileNames: string[];
};

export type AlbumUploadActions = {
	addDroppedFiles: (
		files: File[],
		parties: PartyItem[],
	) => Promise<AddDroppedFilesResult>;
	clear: () => void;
	removeAlbumDraft: (albumId: AlbumLocalId) => void;
};
