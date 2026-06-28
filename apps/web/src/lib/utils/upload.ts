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

async function processFile(file: File): Promise<ProcessedFileData | null> {
	try {
		const { parseBlob } = await getMusicMetadataModule();
		const { blake3Hash } = await hashFileStream(file);
		const metadata = await parseBlob(file);
		console.log(metadata);
		console.log(file);
		let cover: CoverAsset | null = null;

		try {
			cover = await extractCoverAsset(metadata);
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
): Promise<ProcessDroppedFilesResult> {
	const fileDataResults = await pMap(
		files,
		async (file) => {
			return {
				fileName: file.name,
				fileData: await processFile(file),
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
