import type { components } from "#/data/APIschema";

import type { CroppedArea } from "./albumUploadStoreType";

export type CreateConcertRequest =
	components["schemas"]["CreateConcertRequest"];
export type ConcertFileType = components["schemas"]["ConcertFileType"];
export type ConcertUploadStatus =
	| "idle"
	| "creating"
	| "uploading"
	| "completed"
	| "failed";
export type ConcertUploadJobStatus =
	| "queued"
	| "uploading"
	| "completed"
	| "failed";

export type ConcertImageAsset = {
	blake3Hash: string;
	file: File;
	imageRequest: components["schemas"]["ConcertImageRequest"];
	localURL: string;
	croppedArea: CroppedArea;
	height: number;
	width: number;
};

export type ConcertFileDraft = {
	id: string;
	file: File;
	fileName: string;
	title: string;
	type: ConcertFileType;
	simpleBlake3Hash: string;
	mimeType: string;
	sizeInBytes: number;
};

export type UpdateConcertFileDraftInput = Partial<
	Pick<ConcertFileDraft, "title" | "type">
>;

export type ConcertFileUploadResult =
	components["schemas"]["CreateConcertUploadItemResult"];

export type ConcertFileUploadJob = {
	id: string;
	fileObjectId: string;
	simpleBlake3Hash: string;
	fileName: string;
	uploadedPartCount: number;
	totalPartCount: number;
	status: ConcertUploadJobStatus;
	error: string | null;
};

export type ConcertUploadRunState = {
	jobOrder: string[];
	jobsById: Record<string, ConcertFileUploadJob>;
	error: string | null;
};

export type AddConcertDroppedFilesResult = {
	processedFileNames: string[];
	ignoredFileNames: string[];
};

export type ConcertUploadState = {
	title: string;
	description: string;
	date: string | null;
	mainPartyIds: number[];
	guestIds: number[];
	linkedAlbumIds: number[];
	image: ConcertImageAsset | null;
	files: ConcertFileDraft[];
	isProcessing: boolean;
	submitStatus: ConcertUploadStatus;
	uploadRun: ConcertUploadRunState;
	lastError: string | null;
};

export type ConcertUploadActions = {
	setTitle: (title: string) => void;
	setDescription: (description: string) => void;
	setDate: (date: string | null) => void;
	setMainPartyIds: (partyIds: number[]) => void;
	setGuestIds: (partyIds: number[]) => void;
	setLinkedAlbumIds: (albumIds: number[]) => void;
	setImage: (file: File, croppedArea: CroppedArea) => Promise<void>;
	setFiles: (files: ConcertFileDraft[]) => void;
	addDroppedFiles: (files: File[]) => Promise<AddConcertDroppedFilesResult>;
	updateFileDraft: (id: string, input: UpdateConcertFileDraftInput) => void;
	removeFileDraft: (id: string) => void;
	submitConcert: () => Promise<void>;
	clear: () => void;
};
