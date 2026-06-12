import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createAlbums } from "#/lib/api/albums";
import { completeUpload } from "#/lib/api/uploads";
import { uploadMultipartFile } from "#/lib/upload/multipartUpload";
import { processDroppedFiles } from "#/lib/utils/upload";

import {
	buildAlbumRequests,
	insertPreparedFile,
	makeTrackUploadJob,
	mergeAlbumDraft,
	removeCreatedAlbumDraft,
	removeAlbumDraft,
	updateAlbumDraft,
	updateTrackDraft,
} from "./albumUploadStoreFunction";
import type {
	AlbumUploadStatus,
	AlbumUploadActions,
	AlbumUploadRunState,
	AlbumUploadState,
	AddDroppedFilesResult,
	TrackUploadResult,
} from "./albumUploadStoreType";

type AlbumUploadStore = AlbumUploadState & AlbumUploadActions;
type CreateAlbumResultUpload = NonNullable<
	NonNullable<Awaited<ReturnType<typeof createAlbums>>[number]["upload"]>
>;

function createInitialUploadRun(): AlbumUploadRunState {
	return {
		jobOrder: [],
		jobsById: {},
		error: null,
	};
}

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
		uploadRun: createInitialUploadRun(),
		lastError: null,
	};
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
			submitAlbums: async () => {
				const currentState = get();
				if (
					currentState.albumOrder.length === 0 ||
					currentState.isProcessing ||
					currentState.submitStatus === "uploading"
				) {
					return;
				}

				set((state) => {
					state.submitStatus = "creating";
					state.lastError = null;
					state.uploadRun = createInitialUploadRun();
				});

				try {
					const requests = buildAlbumRequests(get());
					const results = await createAlbums(requests);
					const successfulResults = results.filter(
						(result) => result.isSuccess === true && result.upload,
					);
					if (successfulResults.length === 0) {
						const errorMessage =
							results.find((result) => result.errorMessage)?.errorMessage ??
							"No albums were created";
						throw new Error(errorMessage);
					}

					const successfulAlbumIds = new Set(
						successfulResults.map((result) => result.clientTempAlbumId),
					);
					const trackUploads: TrackUploadResult[] = [];

					for (const result of successfulResults) {
						if (!result.upload) continue;
						await uploadImagesBestEffort(result.upload, get());
						trackUploads.push(...(result.upload.tracks ?? []));
					}

					const jobs = trackUploads.map(makeTrackUploadJob);

					set((state) => {
						state.submitStatus = jobs.length > 0 ? "uploading" : "completed";
						state.uploadRun.jobOrder = jobs.map((job) => job.id);
						state.uploadRun.jobsById = Object.fromEntries(
							jobs.map((job) => [job.id, job]),
						);

						for (const albumId of successfulAlbumIds) {
							removeCreatedAlbumDraft(state, albumId);
						}
					});

					for (const trackUpload of trackUploads) {
						const jobId = `trackAudio:${trackUpload.fileObjectId}`;

						if (
							!Object.hasOwn(get().filesByBlake3Hash, trackUpload.blake3Hash)
						) {
							set((state) => {
								state.uploadRun.jobsById[jobId].status = "failed";
								state.uploadRun.jobsById[jobId].error =
									`Missing audio file for ${trackUpload.fileName}`;
							});
							throw new Error(`Missing audio file for ${trackUpload.fileName}`);
						}

						const fileData = get().filesByBlake3Hash[trackUpload.blake3Hash];

						set((state) => {
							state.uploadRun.jobsById[jobId].status = "uploading";
						});

						const parts = await uploadMultipartFile(
							fileData.file,
							trackUpload.multipartUploadInfo,
							{
								onPartUploaded: () => {
									set((state) => {
										state.uploadRun.jobsById[jobId].uploadedPartCount += 1;
									});
								},
							},
						);

						await completeUpload({
							fileObjectId: trackUpload.fileObjectId,
							multipart: {
								uploadId: trackUpload.multipartUploadInfo.uploadId,
								parts,
							},
						});

						set((state) => {
							state.uploadRun.jobsById[jobId].status = "completed";
							delete state.filesByBlake3Hash[trackUpload.blake3Hash];
						});
					}

					set((state) => {
						state.submitStatus = "completed";
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to upload album";

					set((state) => {
						state.submitStatus = "failed";
						state.lastError = errorMessage;
						state.uploadRun.error = errorMessage;

						for (const job of Object.values(state.uploadRun.jobsById)) {
							if (job.status === "uploading") {
								job.status = "failed";
								job.error = errorMessage;
							}
						}
					});

					throw error;
				}
			},
			clear: () => {
				set(() => createInitialState());
			},
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
