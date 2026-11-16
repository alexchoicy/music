import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createAlbums } from "#/lib/api/albums";
import { completeUpload } from "#/lib/api/uploads";
import { processDroppedFiles } from "#/lib/utils/upload";

import {
	buildAlbumRequests,
	bulkUpdateTracks,
	insertPreparedFile,
	mergeAlbumDraft,
	removeCreatedAlbumDraft,
	removeAlbumDraft,
	removeTracks,
	updateAlbumDraft,
	updateTrackDraft,
} from "./albumUploadStoreFunction";
import type {
	AlbumUploadStatus,
	AlbumUploadActions,
	AlbumUploadState,
	AddDroppedFilesResult,
	TrackUploadResult,
} from "./albumUploadStoreType";
import { useUploadStore } from "./uploadStore";

type AlbumUploadStore = AlbumUploadState & AlbumUploadActions;
type CreateAlbumResultUpload = NonNullable<
	NonNullable<Awaited<ReturnType<typeof createAlbums>>[number]["upload"]>
>;

function createInitialState(
	lastStatus: AlbumUploadStatus = "idle",
): AlbumUploadState {
	return {
		coverAssetsIdByHash: {},
		albumOrder: [],
		albumsById: {},
		albumsByMatchingKey: {},
		discsById: {},
		tracksById: {},
		isProcessing: false,
		submitStatus: lastStatus,
		lastError: null,
	};
}

function revokeCoverAssetURLs(state: AlbumUploadState) {
	for (const coverAsset of Object.values(state.coverAssetsIdByHash)) {
		URL.revokeObjectURL(coverAsset.localURL);
	}
}

async function uploadImagesBestEffort(
	upload: CreateAlbumResultUpload,
	state: AlbumUploadState,
) {
	for (const imageUpload of upload.images ?? []) {
		if (!Object.hasOwn(state.coverAssetsIdByHash, imageUpload.blake3Hash)) {
			console.warn(`Missing image file for ${imageUpload.fileName}`);
			continue;
		}

		const coverAsset = state.coverAssetsIdByHash[imageUpload.blake3Hash];

		try {
			const response = await fetch(imageUpload.uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": coverAsset.file.type },
				body: coverAsset.file,
			});

			if (!response.ok) {
				console.warn(
					`Image upload failed for ${imageUpload.fileName}: ${response.status}`,
				);
				continue;
			}

			await completeUpload({
				fileObjectId: imageUpload.fileObjectId,
				multipart: null,
			});
		} catch (error) {
			console.warn(`Image upload failed for ${imageUpload.fileName}`, error);
		}
	}
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
					const addedFiles: { file: File; blake3Hash: string }[] = [];

					result.ignoredFileNames.push(...failedFileNames);

					set((state) => {
						for (const processedFile of processedFiles) {
							if (insertPreparedFile(state, processedFile, parties)) {
								addedFiles.push({
									file: processedFile.file,
									blake3Hash: processedFile.blake3Hash,
								});
								result.processedFileNames.push(processedFile.file.name);
							} else {
								result.ignoredFileNames.push(processedFile.file.name);
							}
						}
					});

					for (const addedFile of addedFiles) {
						useUploadStore
							.getState()
							.addFile(addedFile.file, addedFile.blake3Hash);
					}
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
			submitAlbums: async () => {
				const currentState = get();
				if (
					currentState.albumOrder.length === 0 ||
					currentState.isProcessing ||
					currentState.submitStatus === "uploading"
				) {
					return { createdCount: 0, failed: [] };
				}

				set((state) => {
					state.submitStatus = "uploading";
					state.lastError = null;
				});

				try {
					const requests = buildAlbumRequests(get());
					const results = await createAlbums(requests);
					const successfulResults = results.filter(
						(result) => result.isSuccess === true && result.upload,
					);
					const failed = results
						.filter((result) => !successfulResults.includes(result))
						.map((result) => ({
							title: result.albumTitle,
							message: result.errorMessage ?? "Album was not created",
						}));

					if (successfulResults.length === 0) {
						throw new Error(failed[0]?.message ?? "No albums were created");
					}

					const trackUploads: TrackUploadResult[] = [];

					for (const result of successfulResults) {
						if (!result.upload) continue;
						await uploadImagesBestEffort(result.upload, get());
						trackUploads.push(...(result.upload.tracks ?? []));
					}

					set((state) => {
						for (const result of successfulResults) {
							removeCreatedAlbumDraft(state, result.clientTempAlbumId);
						}

						state.submitStatus =
							state.albumOrder.length > 0 ? "creating" : "completed";
					});

					useUploadStore.getState().startUpload(trackUploads);

					return { createdCount: successfulResults.length, failed };
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to upload album";

					set((state) => {
						state.submitStatus = "failed";
						state.lastError = errorMessage;
					});

					throw error;
				}
			},
			clear: () => {
				set((state) => {
					revokeCoverAssetURLs(state);
					return createInitialState();
				});
			},
			removeAlbumDraft: (albumId) => {
				const fileHashes = Object.hasOwn(get().albumsById, albumId)
					? get().albumsById[albumId].discIds.flatMap((discId) =>
							get().discsById[discId].trackIds.flatMap((trackId) =>
								get().tracksById[trackId].audios.map(
									(audio) => audio.file.blake3Hash,
								),
							),
						)
					: [];

				set((state) => removeAlbumDraft(state, albumId));

				for (const fileHash of fileHashes) {
					useUploadStore.getState().removeFile(fileHash);
				}
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
			bulkUpdateTracks: (trackIds, input) => {
				set((state) => bulkUpdateTracks(state, trackIds, input));
			},
			removeTracks: (trackIds) => {
				const fileHashes = trackIds.flatMap((trackId) =>
					Object.hasOwn(get().tracksById, trackId)
						? get().tracksById[trackId].audios.map(
								(audio) => audio.file.blake3Hash,
							)
						: [],
				);

				set((state) => removeTracks(state, trackIds));

				for (const fileHash of fileHashes) {
					useUploadStore.getState().removeFile(fileHash);
				}
			},
		})),
	),
);
