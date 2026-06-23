import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { components } from "#/data/APIschema";
import { completeUpload } from "#/lib/api/uploads";
import { uploadMultipartFile } from "#/lib/upload/multipartUpload";

export type UploadJobStatus =
	| "waiting"
	| "queued"
	| "uploading"
	| "completed"
	| "failed";

export type MultipartUploadInfo =
	| components["schemas"]["CreateConcertUploadItemResult"]
	| components["schemas"]["CreateAlbumTrackUploadItemResult"]
	| components["schemas"]["StartUploadResult"];

type UploadRecord = {
	file?: File;
	fileName: string;
	uploadedPartCount: number;
	totalPartCount: number;
	multipartUploadInfo?: MultipartUploadInfo;
	status: UploadJobStatus;
	error?: string;
};

type UploadStore = {
	fileByBlake3: Record<string, UploadRecord>;
	isRunning: boolean;
};

type UploadStoreActions = {
	addFile: (file: File, blake3: string) => void;
	removeFile: (blake3: string) => void;
	startUpload: (multipartUploadInfos: MultipartUploadInfo[]) => void;
	runUploadWorker: () => Promise<void>;
};

type UploadStoreState = UploadStore & UploadStoreActions;

function getUploadHash(info: MultipartUploadInfo) {
	if ("fileObject" in info) return info.blake3Hash;
	return "blake3Hash" in info ? info.blake3Hash : info.simpleBlake3Hash;
}

function getFileObjectId(info: MultipartUploadInfo) {
	return "fileObject" in info
		? info.fileObject.fileObjectId
		: info.fileObjectId;
}

function getMultipartUpload(info: MultipartUploadInfo) {
	return "multipartUpload" in info
		? info.multipartUpload
		: info.multipartUploadInfo;
}

function hasQueuedUpload(state: UploadStoreState) {
	return Object.values(state.fileByBlake3).some(
		(record) => record.status === "queued",
	);
}

export const useUploadStore = create<UploadStoreState>()(
	devtools(
		immer((set, get) => ({
			fileByBlake3: {},
			isRunning: false,
			addFile: (file: File, blake3: string) => {
				set((state) => {
					state.fileByBlake3[blake3] = {
						file,
						fileName: file.name,
						uploadedPartCount: 0,
						totalPartCount: 0,
						status: "waiting",
					};
				});
			},
			removeFile: (blake3: string) => {
				set((state) => {
					if (state.fileByBlake3[blake3]?.status === "uploading") return;
					delete state.fileByBlake3[blake3];
				});
			},
			startUpload: (multipartUploadInfos: MultipartUploadInfo[]) => {
				set((state) => {
					for (const info of multipartUploadInfos) {
						const blake3 = getUploadHash(info);
						if (!Object.hasOwn(state.fileByBlake3, blake3)) continue;

						const record = state.fileByBlake3[blake3];
						const multipartUpload = getMultipartUpload(info);

						record.multipartUploadInfo = info;
						record.uploadedPartCount = 0;
						record.totalPartCount = multipartUpload.parts.length;
						record.status = "queued";
						record.error = undefined;
					}
				});

				void get().runUploadWorker();
			},
			runUploadWorker: async () => {
				if (get().isRunning) return;

				set((state) => {
					state.isRunning = true;
				});

				try {
					for (;;) {
						const entry = Object.entries(get().fileByBlake3).find(
							([, record]) =>
								record.status === "queued" && record.multipartUploadInfo,
						);
						if (!entry) break;

						const [blake3, record] = entry;
						const info = record.multipartUploadInfo;
						const file = record.file;
						if (!info) continue;
						if (!file) {
							set((state) => {
								state.fileByBlake3[blake3].status = "failed";
								state.fileByBlake3[blake3].error = "Missing upload file";
							});
							continue;
						}

						set((state) => {
							state.fileByBlake3[blake3].status = "uploading";
						});

						try {
							const multipartUpload = getMultipartUpload(info);
							const parts = await uploadMultipartFile(file, multipartUpload, {
								onPartUploaded: () => {
									set((state) => {
										state.fileByBlake3[blake3].uploadedPartCount += 1;
									});
								},
							});

							await completeUpload({
								fileObjectId: getFileObjectId(info),
								multipart: {
									uploadId: multipartUpload.uploadId,
									parts,
								},
							});

							set((state) => {
								state.fileByBlake3[blake3].status = "completed";
								delete state.fileByBlake3[blake3].file;
								delete state.fileByBlake3[blake3].multipartUploadInfo;
							});
						} catch (error) {
							set((state) => {
								state.fileByBlake3[blake3].status = "failed";
								state.fileByBlake3[blake3].error =
									error instanceof Error ? error.message : "Upload failed";
							});
						}
					}
				} finally {
					set((state) => {
						state.isRunning = false;
					});

					if (hasQueuedUpload(get())) void get().runUploadWorker();
				}
			},
		})),
	),
);
