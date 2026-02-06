import type { IAudioMetadata, IPicture } from "music-metadata";
import type { components } from "@/data/APIschema";
import type { CreateTrack, LocalImage } from "@/models/uploadMusic";
import { hashFileStream } from "./hash";
import { resolveParty } from "./party";
export function normalizeString(input: string) {
	if (!input?.trim()) return "";

	return input
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.trim();
}

const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",

	"audio/mpeg": "mp3",
	"audio/flac": "flac",
	"audio/wav": "wav",
	"audio/ogg": "ogg",
};

function extFromFilename(name: string): string | undefined {
	const match = name.match(/\.([^.]+)$/);
	return match?.[1]?.toLowerCase();
}

export function resolveExtension(file: File): string {
	const mimeExt = MIME_TO_EXT[file.type];
	if (mimeExt) return mimeExt;

	const nameExt = extFromFilename(file.name);
	if (nameExt) return nameExt;

	return "bin";
}

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
	const file = new File([safeU8], `coverFileExtract`, {
		type: metadata.format,
	});
	const ext = resolveExtension(file);

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

export function checkIfMC(title: string, filename: string): boolean {
	const mcIndicators = ["mc", "m.c.", "m.c", "ＭＣ"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return mcIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}

export async function getCreateTrackObjectFromMetadata(
	metadata: IAudioMetadata,
	blake3Hash: string,
	sha1Hash: string,
	file: File,
	parties: components["schemas"]["PartyListModel"][],
): Promise<CreateTrack> {
	const ext = resolveExtension(file);

	const fileRequest: components["schemas"]["FileRequest"] = {
		fileBlake3: blake3Hash,
		fileSHA1: sha1Hash,
		mimeType: file.type,
		fileSizeInBytes: file.size,
		container: file.type,
		extension: ext,
		originalFileName: file.name,
		codec: metadata.format.codec?.toUpperCase(),
		audioSampleRate: metadata.format.sampleRate,
		bitrate: metadata.format.bitrate,
		durationInMs: metadata.format.duration
			? Math.round(metadata.format.duration * 1000)
			: undefined,
	};

	const trackParties = [];
	const trackUnsovled = [];

	for (const metaDataArtist of metadata.common.artists || []) {
		const resolved = resolveParty(metaDataArtist, parties);
		trackParties.push(...resolved.albumParty);
		trackUnsovled.push(...resolved.unsolved);
	}

	return {
		trackNumber: metadata.common.track.no || 0,
		discNumber: metadata.common.disk.no || 0,
		title: metadata.common.title || "Unknown Title",
		isMC: checkIfMC(metadata.common.title || "", file.name),
		durationInMs: metadata.format.duration
			? Math.round(metadata.format.duration * 1000)
			: 0,
		trackCredits: trackParties,
		unsolvedTrackCredits: trackUnsovled,
		trackVariants: [
			{
				variantType: "Default",
				sources: [
					{
						source: "MORA",
						file: fileRequest,
					},
				],
			},
		],
	};
}
