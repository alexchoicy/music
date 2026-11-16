import type * as API from "@music/api";

export type CreateAlbumRequest = API.CreateAlbumRequest;
type AlbumDiscRequest = API.AlbumDiscRequest;
export type ImageRequest = API.AlbumImageRequest;
type AlbumTrackRequest = API.AlbumTrackRequest;
export type PartyItem = API.PartyItems;
export type CreditRequest = API.CreditRequest;
export type LanguageItem = API.LanguageListItem;
export type TrackAudioRequest = API.TrackAudioRequest;

export type AlbumLocalId = string;
export type DiscLocalId = string;
export type TrackLocalId = string;
export type CoverAssetBlake3Hash = string;
export type AlbumUploadStatus =
	| "idle"
	| "creating"
	| "uploading"
	| "completed"
	| "failed";
export type AlbumMatchingKey = string;

export type TrackUploadResult = {
	fileObjectId: string;
	blake3Hash: string;
	fileName: string;
	multipartUploadInfo: API.MultipartUploadResults;
};

export type CroppedArea = {
	x: number;
	y: number;
	width: number;
	height: number;
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
	discCoversById: Partial<Record<DiscLocalId, CoverAsset | null>>;
	discSubtitlesById: Partial<Record<DiscLocalId, string>>;
};

export type UpdateTrackDraftInput = {
	title: string;
	discNumber: number;
	trackNumber: number;
	languageId: CreateAlbumRequest["languageId"];
	contentType: NonNullable<AlbumTrackRequest["contentType"]>;
	versionType: NonNullable<AlbumTrackRequest["versionType"]>;
	clearUnsolvedTrackCredits: boolean;
	credits: CreditRequest[];
	source: NonNullable<TrackAudioRequest["source"]>;
	sourceUrl: TrackAudioRequest["sourceUrl"];
};

export type BulkCreditsChange =
	| { mode: "keep" | "album" | "clear" }
	| { mode: "replace" | "add"; credits: CreditRequest[] };

// Optional fields are left unchanged when undefined
export type BulkUpdateTracksInput = {
	credits: BulkCreditsChange;
	clearUnsolvedCredits: boolean;
	titleFind: string;
	titleReplace: string;
	languageId?: AlbumTrackRequest["languageId"];
	contentType?: NonNullable<AlbumTrackRequest["contentType"]>;
	versionType?: NonNullable<AlbumTrackRequest["versionType"]>;
	source?: NonNullable<TrackAudioRequest["source"]>;
	sourceUrl?: TrackAudioRequest["sourceUrl"];
	discNumber?: number;
	renumber: boolean;
};

export type SubmitAlbumsResult = {
	createdCount: number;
	failed: { title: string; message: string }[];
};

export type MergeAlbumDraftInput = {
	targetAlbumId: AlbumLocalId;
	mergeAsNewDisc: boolean;
	newDiscSubtitle: string;
};

export type AddDroppedFilesResult = {
	processedFileNames: string[];
	ignoredFileNames: string[];
};

export type AlbumUploadState = {
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
	submitAlbums: () => Promise<SubmitAlbumsResult>;
	clear: () => void;
	removeAlbumDraft: (albumId: AlbumLocalId) => void;
	mergeAlbumDraft: (albumId: AlbumLocalId, input: MergeAlbumDraftInput) => void;
	updateAlbumDraft: (
		albumId: AlbumLocalId,
		input: UpdateAlbumDraftInput,
	) => void;
	updateTrackDraft: (
		trackId: TrackLocalId,
		input: UpdateTrackDraftInput,
	) => void;
	bulkUpdateTracks: (
		trackIds: TrackLocalId[],
		input: BulkUpdateTracksInput,
	) => void;
	removeTracks: (trackIds: TrackLocalId[]) => void;
};
