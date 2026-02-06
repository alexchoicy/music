import type { IAudioMetadata, IPicture } from "music-metadata";
import type { components } from "@/data/APIschema";
import type { LocalImage } from "@/models/uploadMusic";
import { hashFileStream } from "./hash";
export function normalizeString(input: string) {
	if (!input?.trim()) return "";

	return input
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.trim();
}

function extFromMime(mime?: string) {
	if (!mime) return "bin";
	if (mime === "image/jpeg") return "jpg";
	if (mime === "image/png") return "png";
	if (mime === "image/webp") return "webp";
	return mime.split("/")[1] ?? "bin";
}

export function convertIntoMusicUploadObject(metadata: IAudioMetadata) {}

export async function getDimensions(file: Blob) {
	const bitmap = await createImageBitmap(file);

	const result = {
		width: bitmap.width,
		height: bitmap.height,
	};

	bitmap.close();
	return result;
}

export async function getImageFileRequestFromMetadata(
	metadata: IPicture,
): Promise<LocalImage> {
	const safeU8 = new Uint8Array(metadata.data);
	const ext = extFromMime(metadata.type);
	const file = new File([safeU8], `cover.${ext}`, { type: metadata.format });

	const { blake3Hash, sha1Hash } = await hashFileStream(file);

	const dimensions = await getDimensions(file);

	const fileRequest: components["schemas"]["FileRequest"] = {
		fileBlake3: blake3Hash,
		fileSHA1: sha1Hash,
		mimeType: metadata.format,
		fileSizeInBytes: file.size,
		container: metadata.format,
		extension: ext,
		width: dimensions.width,
		height: dimensions.height,
		originalFileName: file.name,
	};

	return {
		file: fileRequest,
		localFile: file,
		localURL: URL.createObjectURL(file),
	};
}
