import pMap from "p-map";

import type { components } from "#/data/APIschema";
import { completeUpload } from "#/lib/api/uploads";
import {
	getExtensionFromFileName,
	getExtensionFromMimeType,
	getMimeTypeFromFileName,
} from "#/lib/utils/file";
import { hashBlake3Simple, hashFileStream } from "#/lib/utils/hash";
import { useUploadStore } from "#/store/uploadStore";

type FileRequest = components["schemas"]["FileRequest"];
type ExtraAssetUploadResult = components["schemas"]["ExtraAssetUploadResult"];

export type PreparedExtraFile = {
	file: File;
	blake3Hash: string;
	fileRequest: FileRequest;
	isImage: boolean;
	width: number | null;
	height: number | null;
	// Small local preview, full size scans are too heavy to render in a list
	thumbnail: Blob | null;
};

const THUMBNAIL_SIZE = 256;

// Reads the size without decoding the pixels, scans can be 60+ megapixels
async function getImageSize(file: File) {
	const url = URL.createObjectURL(file);
	try {
		const image = new Image();
		image.decoding = "async";
		image.src = url;
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error(`Cannot read image ${file.name}`));
		});
		return { width: image.naturalWidth, height: image.naturalHeight };
	} finally {
		URL.revokeObjectURL(url);
	}
}

async function createThumbnail(file: File, width: number, height: number) {
	const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(width, height));
	try {
		const bitmap = await createImageBitmap(file, {
			resizeWidth: Math.max(1, Math.round(width * scale)),
			resizeHeight: Math.max(1, Math.round(height * scale)),
			resizeQuality: "medium",
		});
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
		bitmap.close();
		return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
	} catch {
		return null;
	}
}

function getMimeType(file: File) {
	return (
		file.type ||
		getMimeTypeFromFileName(file.name) ||
		"application/octet-stream"
	);
}

export async function prepareExtraFile(file: File): Promise<PreparedExtraFile> {
	const mimeType = getMimeType(file);
	const isImage = mimeType.startsWith("image/");

	// Images use the full hash like covers, large media use the sampled hash like concert files
	const { blake3Hash } = isImage
		? await hashFileStream(file)
		: await hashBlake3Simple(file);
	const dimensions = isImage ? await getImageSize(file) : null;
	const thumbnail = dimensions
		? await createThumbnail(file, dimensions.width, dimensions.height)
		: null;
	const extension =
		getExtensionFromMimeType(mimeType) || getExtensionFromFileName(file.name);

	return {
		file,
		blake3Hash,
		isImage,
		width: dimensions?.width ?? null,
		height: dimensions?.height ?? null,
		thumbnail,
		fileRequest: {
			blake3Hash,
			mimeType,
			sizeInBytes: file.size,
			container: extension,
			extension,
			codec: null,
			width: dimensions?.width ?? null,
			height: dimensions?.height ?? null,
			audioSampleRate: null,
			bitrate: null,
			frameRate: null,
			durationInMs: null,
			originalFileName: file.name,
		},
	};
}

// Uploads images directly and hands other files to the background upload queue.
export async function uploadExtraFiles(
	uploads: ExtraAssetUploadResult[],
	filesByHash: Map<string, File>,
	onImageUploaded?: (done: number, total: number) => void,
) {
	const imageUploads = uploads.filter((upload) => upload.uploadUrl);
	const multipartUploads = uploads.filter(
		(upload) => upload.multipartUploadInfo,
	);
	let done = 0;

	await pMap(
		imageUploads,
		async (upload) => {
			const file = filesByHash.get(upload.blake3Hash);
			if (!file) throw new Error("Missing file for upload");

			const response = await fetch(upload.uploadUrl!, {
				method: "PUT",
				headers: { "Content-Type": getMimeType(file) },
				body: file,
			});
			if (!response.ok) {
				throw new Error(`Upload of ${file.name} failed: ${response.status}`);
			}

			await completeUpload({ fileObjectId: upload.fileObjectId });
			done += 1;
			onImageUploaded?.(done, imageUploads.length);
		},
		{ concurrency: 2 },
	);

	const uploadStore = useUploadStore.getState();
	for (const upload of multipartUploads) {
		const file = filesByHash.get(upload.blake3Hash);
		if (file) uploadStore.addFile(file, upload.blake3Hash);
	}

	uploadStore.startUpload(
		multipartUploads.map((upload) => ({
			fileName: filesByHash.get(upload.blake3Hash)?.name ?? upload.blake3Hash,
			fileObjectId: upload.fileObjectId,
			simpleBlake3Hash: upload.blake3Hash,
			multipartUploadInfo: upload.multipartUploadInfo!,
		})),
	);

	return { backgroundUploadCount: multipartUploads.length };
}
