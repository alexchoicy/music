import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createConcert } from "#/lib/api/concerts";
import {
	getDimensions,
	getExtensionFromFileName,
	getExtensionFromMimeType,
} from "#/lib/utils/file";
import { hashBlake3Simple, hashFileStream } from "#/lib/utils/hash";

import type { CroppedArea } from "./albumUploadStoreType";
import type {
	AddConcertDroppedFilesResult,
	ConcertFileDraft,
	ConcertImageAsset,
	ConcertUploadActions,
	ConcertUploadState,
	ConcertUploadStatus,
	CreateConcertRequest,
	UpdateConcertFileDraftInput,
} from "./concertUploadStoreType";
import { useUploadStore } from "./uploadStore";

type ConcertUploadStore = ConcertUploadState & ConcertUploadActions;
type ConcertUploadImageResult = NonNullable<
	Awaited<ReturnType<typeof createConcert>>["concertImage"]
>;

const DEFAULT_CONCERT_FILE_SOURCE = "UserUpload";

function createInitialState(
	lastStatus: ConcertUploadStatus = "idle",
): ConcertUploadState {
	return {
		title: "",
		description: "",
		date: null,
		mainPartyIds: [],
		guestIds: [],
		linkedAlbumIds: [],
		image: null,
		files: [],
		isProcessing: false,
		submitStatus: lastStatus,
		lastError: null,
	};
}

function getTitleFromFileName(fileName: string): string {
	return fileName.replace(/\.[^/.]+$/, "");
}

function getMimeType(file: File): string {
	return file.type || "application/octet-stream";
}

function markDirty(state: ConcertUploadState) {
	if (state.submitStatus !== "completed") return;

	state.submitStatus = "idle";
	state.lastError = null;
}

function buildConcertRequest(state: ConcertUploadState): CreateConcertRequest {
	return {
		title: state.title.trim(),
		description: state.description,
		date: state.date,
		image: state.image?.imageRequest ?? null,
		linkedAlbumIds: state.linkedAlbumIds,
		linkedParties: [
			...state.mainPartyIds.map((partyId) => ({
				partyId,
				role: "MainArtist" as const,
			})),
			...state.guestIds.map((partyId) => ({
				partyId,
				role: "Guest" as const,
			})),
		],
		files: state.files.map((file, index) => ({
			title: file.title.trim() || getTitleFromFileName(file.fileName),
			type: file.type,
			order: index + 1,
			source: file.source,
			sourceUrl: file.sourceUrl.trim() || null,
			simpleBlake3Hash: file.simpleBlake3Hash,
			mimeType: file.mimeType,
			sizeInBytes: file.sizeInBytes,
			originalFileName: file.fileName,
		})),
	};
}

async function createConcertImageAsset(
	file: File,
	croppedArea: CroppedArea,
): Promise<ConcertImageAsset> {
	const { blake3Hash } = await hashFileStream(file);
	const dimensions = await getDimensions(file);
	const mimeType = getMimeType(file);
	const extension =
		getExtensionFromMimeType(mimeType) || getExtensionFromFileName(file.name);

	return {
		blake3Hash,
		file,
		imageRequest: {
			file: {
				blake3Hash,
				mimeType,
				sizeInBytes: file.size,
				container: extension,
				extension,
				codec: null,
				width: dimensions.width,
				height: dimensions.height,
				audioSampleRate: null,
				bitrate: null,
				frameRate: null,
				durationInMs: null,
				originalFileName: file.name,
			},
			croppedArea,
		},
		localURL: URL.createObjectURL(file),
		croppedArea,
		height: dimensions.height,
		width: dimensions.width,
	};
}

async function makeConcertFileDraft(file: File): Promise<ConcertFileDraft> {
	const { blake3Hash } = await hashBlake3Simple(file);

	return {
		file,
		fileName: file.name,
		id: crypto.randomUUID(),
		mimeType: getMimeType(file),
		source: DEFAULT_CONCERT_FILE_SOURCE,
		sourceUrl: "",
		simpleBlake3Hash: blake3Hash,
		sizeInBytes: file.size,
		title: getTitleFromFileName(file.name),
		type: "Performance",
	};
}

async function uploadConcertImage(
	imageUpload: ConcertUploadImageResult,
	state: ConcertUploadState,
) {
	if (!state.image || state.image.blake3Hash !== imageUpload.blake3Hash) {
		throw new Error("Missing concert image file");
	}

	const response = await fetch(imageUpload.uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": getMimeType(state.image.file) },
		body: state.image.file,
	});

	if (!response.ok) {
		throw new Error(`Concert image upload failed: ${response.status}`);
	}
}

export const useConcertUploadStore = create<ConcertUploadStore>()(
	devtools(
		immer((set, get) => ({
			...createInitialState(),
			setTitle: (title) => {
				set((state) => {
					state.title = title;
					markDirty(state);
				});
			},
			setDescription: (description) => {
				set((state) => {
					state.description = description;
					markDirty(state);
				});
			},
			setDate: (date) => {
				set((state) => {
					state.date = date;
					markDirty(state);
				});
			},
			setMainPartyIds: (partyIds) => {
				set((state) => {
					state.mainPartyIds = partyIds;
					markDirty(state);
				});
			},
			setGuestIds: (partyIds) => {
				set((state) => {
					state.guestIds = partyIds;
					markDirty(state);
				});
			},
			setLinkedAlbumIds: (albumIds) => {
				set((state) => {
					state.linkedAlbumIds = albumIds;
					markDirty(state);
				});
			},
			setImage: async (file, croppedArea) => {
				const image = await createConcertImageAsset(file, croppedArea);

				set((state) => {
					if (state.image) URL.revokeObjectURL(state.image.localURL);
					state.image = image;
					markDirty(state);
				});
			},
			setFiles: (files) => {
				set((state) => {
					state.files = files;
					markDirty(state);
				});
			},
			addDroppedFiles: async (files) => {
				const result: AddConcertDroppedFilesResult = {
					processedFileNames: [],
					ignoredFileNames: [],
				};

				if (get().isProcessing) {
					result.ignoredFileNames.push(...files.map((file) => file.name));
					return result;
				}

				set((state) => {
					state.isProcessing = true;
					state.lastError = null;
				});

				try {
					const drafts: ConcertFileDraft[] = [];
					const addedDrafts: ConcertFileDraft[] = [];

					for (const file of files) {
						try {
							drafts.push(await makeConcertFileDraft(file));
						} catch (error) {
							console.error(`Error processing file ${file.name}:`, error);
							result.ignoredFileNames.push(file.name);
						}
					}

					set((state) => {
						for (const draft of drafts) {
							const isDuplicate = state.files.some(
								(file) => file.simpleBlake3Hash === draft.simpleBlake3Hash,
							);

							if (isDuplicate) {
								result.ignoredFileNames.push(draft.fileName);
								continue;
							}

							state.files.push(draft);
							addedDrafts.push(draft);
							result.processedFileNames.push(draft.fileName);
						}

						markDirty(state);
					});

					for (const draft of addedDrafts) {
						useUploadStore
							.getState()
							.addFile(draft.file, draft.simpleBlake3Hash);
					}
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Failed to process concert files";

					console.error(errorMessage, error);
					result.ignoredFileNames.push(...files.map((file) => file.name));

					set((state) => {
						state.lastError = errorMessage;
					});
				} finally {
					set((state) => {
						state.isProcessing = false;
					});
				}

				return result;
			},
			updateFileDraft: (id, input: UpdateConcertFileDraftInput) => {
				set((state) => {
					const file = state.files.find((item) => item.id === id);
					if (!file) return;

					Object.assign(file, input);
					markDirty(state);
				});
			},
			removeFileDraft: (id) => {
				const fileHash = get().files.find(
					(file) => file.id === id,
				)?.simpleBlake3Hash;

				set((state) => {
					state.files = state.files.filter((file) => file.id !== id);
					markDirty(state);
				});

				if (fileHash) useUploadStore.getState().removeFile(fileHash);
			},
			submitConcert: async () => {
				const currentState = get();
				if (
					!currentState.title.trim() ||
					currentState.isProcessing ||
					currentState.submitStatus === "uploading" ||
					currentState.submitStatus === "completed"
				) {
					return;
				}

				set((state) => {
					state.submitStatus = "uploading";
					state.lastError = null;
				});

				try {
					const concert = await createConcert(buildConcertRequest(get()));

					if (concert.concertImage) {
						await uploadConcertImage(concert.concertImage, get());
					}

					useUploadStore.getState().startUpload(concert.files ?? []);

					get().clear();
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to upload concert";

					set((state) => {
						state.submitStatus = "failed";
						state.lastError = errorMessage;
					});

					throw error;
				}
			},
			clear: () => {
				const image = get().image;
				if (image) URL.revokeObjectURL(image.localURL);
				set(() => createInitialState());
			},
		})),
	),
);
