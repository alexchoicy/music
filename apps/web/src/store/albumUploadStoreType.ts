import type { IAudioMetadata } from "music-metadata";

import type { components } from "#/data/APIschema";

export type CreateAlbumRequest = components["schemas"]["CreateAlbumRequest"];
type AlbumDiscRequest = components["schemas"]["AlbumDiscRequest"];
export type ImageRequest = components["schemas"]["AlbumImageRequest"];
type AlbumTrackRequest = components["schemas"]["AlbumTrackRequest"];
export type PartyItem = components["schemas"]["PartyItems"];
export type CreditRequest = components["schemas"]["CreditRequest"];
export type LanguageItem = components["schemas"]["LanguageListItem"];
type TrackAudioRequest = components["schemas"]["TrackAudioRequest"];

export type LocalFileBlake3Hash = string;
export type AlbumLocalId = string;
export type DiscLocalId = string;
export type TrackLocalId = string;
export type CoverAssetBlake3Hash = string;
export type AlbumUploadStatus = "idle" | "creating" | "uploading";
export type AlbumMatchingKey = string;

export type CroppedArea = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type ProcessedUploadFile = {
	blake3Hash: LocalFileBlake3Hash;
	file: File;
	metadata: IAudioMetadata;
};

export type CoverAsset = {
	blake3Hash: CoverAssetBlake3Hash;
	file: File;
	imageRequest: ImageRequest;
	localURL: string;
	croppedArea: CroppedArea;
	height: number;
	width: number;
	mimeType: string;
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
	coverAssetIdByHash: CoverAssetBlake3Hash | null;
	trackIds: TrackLocalId[];
};

export type TrackDraft = Omit<AlbumTrackRequest, "clientTempTrackId"> & {
	localId: TrackLocalId;
	albumId: AlbumLocalId;
	discId: DiscLocalId;
	unsolvedCredits: string[];
	hasVariousArtists: boolean;
};

export type UpdateAlbumDraftInput = {
	title: string;
	type: CreateAlbumRequest["type"];
	languageId: CreateAlbumRequest["languageId"];
	releaseDate: CreateAlbumRequest["releaseDate"];
	clearUnsolvedAlbumCredits: boolean;
	cover: CoverAsset | null;
	credits: CreditRequest[];
	discCoversById: Partial<Record<DiscLocalId, CoverAsset>>;
	discSubtitlesById: Partial<Record<DiscLocalId, string>>;
	replaceAudioSource: TrackAudioRequest["source"] | null;
	replaceTrackCredits: CreditRequest[] | null;
	replaceTrackLanguageId: AlbumTrackRequest["languageId"] | null;
};

export type AddDroppedFilesResult = {
	processedFileNames: string[];
	ignoredFileNames: string[];
};

export type AlbumUploadState = {
	filesByBlake3Hash: Record<LocalFileBlake3Hash, ProcessedUploadFile>;
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

export type AlbumUploadActions = {
	addDroppedFiles: (
		files: File[],
		parties: PartyItem[],
	) => Promise<AddDroppedFilesResult>;
	clear: () => void;
	removeAlbumDraft: (albumId: AlbumLocalId) => void;
	updateAlbumDraft: (
		albumId: AlbumLocalId,
		input: UpdateAlbumDraftInput,
	) => void;
};
