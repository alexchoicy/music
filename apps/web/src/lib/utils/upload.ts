import { parseBlob } from "music-metadata";
import type { IAudioMetadata } from "music-metadata";
import pMap from "p-map";

import type { components } from "#/data/APIschema";

import { hashFileStream } from "./hash";
import { normalizeString } from "./string";

type ProcessedFileData = {
	file: File;
	blake3Hash: string;
	metadata: IAudioMetadata;
};

export async function processFile(
	file: File,
): Promise<ProcessedFileData | null> {
	try {
		const { blake3Hash } = await hashFileStream(file);
		const metadata = await parseBlob(file);
		return { file, blake3Hash, metadata };
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
): Promise<ProcessedFileData[]> {
	const fileDataResults = await pMap(files, processFile, { concurrency });

	return fileDataResults.filter((result) => result !== null);
}

export function makeAlbumMatchingKey(
	title: string,
	credits: components["schemas"]["AlbumCreditRequest"][],
	unsolvedArtists: string[],
): string {
	const t = normalizeString(title);

	const c = [...credits].map((x) => `${x.partyId}:${x.credit}`).join("|");

	const u = unsolvedArtists.map((a) => normalizeString(a)).join("|");

	return `${t}__${c}__${u}`;
}
