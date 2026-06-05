import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

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
		filesById: {},
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
	immer((set) => ({
		...createInitialState(),
		addDroppedFiles: async (files, parties) => {
			const result: AddDroppedFilesResult = {
				processedFileNames: [],
				ignoredFileNames: [],
			};
			set((state) => {
				state.isProcessing = true;
				state.lastError = null;
			});
			return result;
		},
		clear: () => {},
		removeAlbumDraft: (albumId) => {
			void albumId;
		},
	})),
);
