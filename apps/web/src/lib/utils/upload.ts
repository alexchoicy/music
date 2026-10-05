import type { IAudioMetadata } from "music-metadata";
import type * as MusicMetadata from "music-metadata";
import pMap from "p-map";

import type { components } from "#/data/APIschema";
import type {
	CoverAsset,
	CroppedArea,
	ImageRequest,
} from "#/store/albumUploadStoreType";

import {
	getDimensions,
	getExtensionFromFileName,
	getExtensionFromMimeType,
	getMimeTypeFromFileName,
} from "./file";
import { hashBlake3FileUnit8Array, hashFileStream } from "./hash";
import { normalizeString } from "./string";

export type ProcessedFileData = {
	file: File;
	blake3Hash: string;
	metadata: IAudioMetadata;
	cover: CoverAsset | null;
};

export type ProcessDroppedFilesResult = {
	processedFiles: ProcessedFileData[];
	failedFileNames: string[];
};

// Raw file tags. They are candidate metadata only, never Party identity.
export type AudioTags = {
	title: string | null;
	album: string | null;
	artists: string[];
	albumArtists: string[];
	trackNumber: number | null;
	trackTotal: number | null;
	discNumber: number | null;
	discTotal: number | null;
	date: string | null;
	genres: string[];
};

let musicMetadataModulePromise: Promise<typeof MusicMetadata> | null = null;

async function getMusicMetadataModule() {
	if (!musicMetadataModulePromise) {
		musicMetadataModulePromise = import("music-metadata");
	}

	return musicMetadataModulePromise;
}

export async function createCoverAsset(
	file: File,
	fileName: string,
	croppedArea?: CroppedArea,
): Promise<CoverAsset | null> {
	const { blake3Hash } = await hashFileStream(file);
	const dimensions = await getDimensions(file);
	const extension =
		getExtensionFromMimeType(file.type) || getExtensionFromFileName(fileName);

	const area = croppedArea ?? {
		x: 0,
		y: 0,
		width: dimensions.width,
		height: dimensions.height,
	};

	const imageRequest: ImageRequest = {
		clientReferenceId: crypto.randomUUID(),
		file: {
			blake3Hash,
			mimeType: file.type,
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
			originalFileName: fileName,
		},
		description: "",
		croppedArea: area,
	};

	return {
		blake3Hash,
		file,
		imageRequest,
		localURL: URL.createObjectURL(file),
		croppedArea: area,
		height: dimensions.height,
		width: dimensions.width,
		mimeType: file.type,
	};
}

async function extractCoverAsset(
	metadata: IAudioMetadata,
): Promise<CoverAsset | null> {
	const { selectCover } = await getMusicMetadataModule();
	const picture = selectCover(metadata.common.picture);
	if (!picture) return null;

	const safeU8 = new Uint8Array(picture.data);
	const blake3Hash = await hashBlake3FileUnit8Array(safeU8);
	const extension = getExtensionFromMimeType(picture.format);
	const originalFileName =
		picture.name?.trim() || `cover-${blake3Hash}.${extension}`;
	const file = new File([safeU8], originalFileName, { type: picture.format });

	return createCoverAsset(file, originalFileName);
}

async function processFile(
	file: File,
	extractCover: boolean,
): Promise<ProcessedFileData | null> {
	try {
		const { parseBlob } = await getMusicMetadataModule();
		const { blake3Hash } = await hashFileStream(file);
		const metadata = await parseBlob(file, { skipCovers: !extractCover });
		console.log(metadata);
		console.log(file);
		let cover: CoverAsset | null = null;

		try {
			if (extractCover) cover = await extractCoverAsset(metadata);
		} catch (error) {
			console.error(`Error extracting cover from file ${file.name}:`, error);
		}

		return { file, blake3Hash, metadata, cover };
	} catch (error) {
		console.error(`Error processing file ${file.name}:`, error);
		return null;
	} finally {
		console.log(`Finished processing file: ${file.name}`);
	}
}

export async function processDroppedFiles(
	files: File[],
	concurrency: number = 4,
	extractCover: boolean = true,
): Promise<ProcessDroppedFilesResult> {
	const fileDataResults = await pMap(
		files,
		async (file) => {
			return {
				fileName: file.name,
				fileData: await processFile(file, extractCover),
			};
		},
		{ concurrency },
	);

	return fileDataResults.reduce<ProcessDroppedFilesResult>(
		(result, fileDataResult) => {
			if (fileDataResult.fileData) {
				result.processedFiles.push(fileDataResult.fileData);
			} else {
				result.failedFileNames.push(fileDataResult.fileName);
			}

			return result;
		},
		{ processedFiles: [], failedFileNames: [] },
	);
}

export function getAudioTags(metadata: IAudioMetadata): AudioTags {
	const { common } = metadata;

	return {
		title: common.title ?? null,
		album: common.album ?? null,
		artists: common.artists ?? [],
		albumArtists: common.albumartists ?? [],
		trackNumber: common.track.no,
		trackTotal: common.track.of,
		discNumber: common.disk.no,
		discTotal: common.disk.of,
		date: common.date ?? (common.year ? String(common.year) : null),
		genres: common.genre ?? [],
	};
}

export function getAudioDurationInMs(metadata: IAudioMetadata) {
	return Math.round((metadata.format.duration ?? 0) * 1000);
}

export function createAudioFileRequest(
	fileData: ProcessedFileData,
): components["schemas"]["FileRequest"] {
	const mimeType =
		fileData.file.type || getMimeTypeFromFileName(fileData.file.name);
	const extension =
		getExtensionFromMimeType(mimeType) ||
		getExtensionFromFileName(fileData.file.name);

	return {
		blake3Hash: fileData.blake3Hash,
		mimeType,
		sizeInBytes: fileData.file.size,
		container:
			fileData.metadata.format.container?.trim().toLowerCase() || extension,
		extension: extension,
		codec: fileData.metadata.format.codec?.trim().toLowerCase() ?? null,
		width: null,
		height: null,
		audioSampleRate: fileData.metadata.format.sampleRate ?? null,
		bitrate: Math.round(fileData.metadata.format.bitrate ?? 0),
		frameRate: null,
		durationInMs: getAudioDurationInMs(fileData.metadata),
		originalFileName: fileData.file.name,
		bitsPerSample: fileData.metadata.format.bitsPerSample ?? null,
		lossless: fileData.metadata.format.lossless ?? false,
		audioChannels: fileData.metadata.format.numberOfChannels ?? null,
	};
}

export function makeAlbumMatchingKey(
	title: string,
	credits: components["schemas"]["CreditRequest"][],
	unsolvedArtists: string[],
): string {
	const t = normalizeString(title);

	const c = credits.map((x) => `${x.partyId}:${x.credit}`).join("|");

	const u = unsolvedArtists.map((a) => normalizeString(a)).join("|");

	return `${t}__${c}__${u}`;
}
