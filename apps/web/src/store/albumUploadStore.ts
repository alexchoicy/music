import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { processDroppedFiles } from "#/lib/utils/upload";

import {
	insertPreparedFile,
	mergeAlbumDraft,
	removeAlbumDraft,
	updateAlbumDraft,
	updateTrackDraft,
} from "./albumUploadStoreFunction";
import type {
	AlbumUploadStatus,
	AlbumUploadActions,
	AlbumUploadState,
	AddDroppedFilesResult,
} from "./albumUploadStoreType";

type AlbumUploadStore = AlbumUploadState & AlbumUploadActions;

function createInitialState(
	lastStatus: AlbumUploadStatus = "idle",
): AlbumUploadState {
	return {
		filesByBlake3Hash: {},
		coverAssetsIdByHash: {},
		albumOrder: [],
		albumsById: {},
		albumsByMatchingKey: {},
		discsById: {},
		tracksById: {},
		isProcessing: false,
		submitStatus: lastStatus === "uploading" ? "uploading" : lastStatus,
		lastError: null,
	};
}

export const useAlbumUploadStore = create<AlbumUploadStore>()(
	devtools(
		immer((set, get) => ({
			...createInitialState(),
			addDroppedFiles: async (files, parties) => {
				const result: AddDroppedFilesResult = {
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
					const { failedFileNames, processedFiles } =
						await processDroppedFiles(files);

					result.ignoredFileNames.push(...failedFileNames);

					set((state) => {
						for (const processedFile of processedFiles) {
							if (insertPreparedFile(state, processedFile, parties)) {
								result.processedFileNames.push(processedFile.file.name);
							} else {
								result.ignoredFileNames.push(processedFile.file.name);
							}
						}
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Failed to process dropped files";

					console.error(errorMessage, error);
					result.ignoredFileNames.push(...files.map((file) => file.name));

					set((state) => {
						state.lastError = errorMessage;
					});
				} finally {
					set((state) => {
						state.isProcessing = false;
						if (state.albumOrder.length > 0) state.submitStatus = "creating";
					});
				}
				return result;
			},
			clear: () => {},
			removeAlbumDraft: (albumId) => {
				set((state) => removeAlbumDraft(state, albumId));
			},
			mergeAlbumDraft: (albumId, input) => {
				set((state) => mergeAlbumDraft(state, albumId, input));
			},
			updateAlbumDraft: (albumId, input) => {
				set((state) => updateAlbumDraft(state, albumId, input));
			},
			updateTrackDraft: (trackId, input) => {
				set((state) => updateTrackDraft(state, trackId, input));
			},
		})),
	),
);
