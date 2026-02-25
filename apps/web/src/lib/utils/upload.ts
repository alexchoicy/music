import { type IAudioMetadata, type IPicture, parseBlob } from "music-metadata";
import pMap from "p-map";
import type { components } from "@/data/APIschema";
import type {
	LocalID,
	LocalImage,
	UploadMusicState,
} from "@/models/uploadMusic";
import { getDimensions, resolveExtension } from "./file";
import { hashFileStream } from "./hash";
import { checkIfMC } from "./music";
import { resolveParty } from "./party";
import { normalizeString } from "./string";

export async function getImageFileRequestFromMetadata(
	metadata: IPicture,
): Promise<LocalImage> {
	const safeU8 = new Uint8Array(metadata.data);
	const file = new File([safeU8], `coverFileExtract`, {
		type: metadata.format,
	});
	const ext = resolveExtension(file);

	const { blake3Hash } = await hashFileStream(file);

	const dimensions = await getDimensions(file);

	const fileRequest: components["schemas"]["FileRequest"] = {
		fileBlake3: blake3Hash,
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

// replace the whole state is more easier
export async function processDroppedFiles(
	files: File[],
	currentState: UploadMusicState,
	parties: components["schemas"]["PartyListModel"][],
	concurrency: number = 4,
): Promise<{ newState: UploadMusicState; skipped: string[] }> {
	const fileDataResults = await pMap(files, processFile, { concurrency });

	const newState: UploadMusicState = {
		albumIds: [...currentState.albumIds],
		albums: { ...currentState.albums },
		discs: { ...currentState.discs },
		tracks: { ...currentState.tracks },
		trackVariants: { ...currentState.trackVariants },
		albumCovers: { ...currentState.albumCovers },
	};

	const skipped: string[] = [];
	const uploadAlbumsMap = new Map<string, LocalID>();

	Object.entries(newState.albums).forEach(([id, album]) => {
		uploadAlbumsMap.set(album.albumMatchId, id);
	});

	for (const fileData of fileDataResults) {
		if (!fileData) continue;

		const { file, blake3Hash, metadata } = fileData;

		if (newState.trackVariants[blake3Hash]) {
			skipped.push(file.name);
			continue;
		}

		const normalizedAlbumTitle = metadata.common.album
			? normalizeString(metadata.common.album)
			: "UNKNOWN ALBUM";

		const albumParty = resolveParty(metadata.common.albumartist, parties);
		const albumMatchKey = makeMatchingKey(
			normalizedAlbumTitle,
			albumParty.albumParty,
			albumParty.unsolved,
		);

		let albumId = uploadAlbumsMap.get(albumMatchKey);

		if (!albumId) {
			albumId = crypto.randomUUID() as LocalID;
			uploadAlbumsMap.set(albumMatchKey, albumId);

			newState.albums[albumId] = {
				id: albumId,
				albumMatchId: albumMatchKey,
				title: metadata.common.album || "UNKNOWN ALBUM",
				type: "Album",
				unsolvedAlbumCredits: albumParty.unsolved,
				albumCredits: albumParty.albumParty,
				OrderedAlbumDiscsIds: [],
			};

			newState.albumIds.push(albumId);

			// Extract cover
			if (metadata.common.picture?.[0]) {
				try {
					const cover = await getImageFileRequestFromMetadata(
						metadata.common.picture[0],
					);
					newState.albumCovers[albumId] = cover;
				} catch (e) {
					console.error("Failed to extract cover:", e);
				}
			}
		}

		const album = newState.albums[albumId];
		const discNumber = metadata.common.disk?.no || 1;

		let discId = album.OrderedAlbumDiscsIds.find((id) => {
			return newState.discs[id]?.discNumber === discNumber;
		});

		if (!discId) {
			discId = crypto.randomUUID() as LocalID;

			newState.discs[discId] = {
				id: discId,
				albumId,
				discNumber,
				OrderedTrackIds: [],
			};

			album.OrderedAlbumDiscsIds.push(discId);
		}

		const disc = newState.discs[discId];

		const trackId = crypto.randomUUID() as LocalID;
		const trackParty = resolveParty(metadata.common.artist, parties);
		const ext = resolveExtension(file);

		newState.tracks[trackId] = {
			id: trackId,
			discId,
			trackNumber: metadata.common.track?.no || 0,
			title: metadata.common.title || "UNKNOWN TITLE",
			description: "",
			languageId: metadata.common.language || "und",
			isMC: checkIfMC(metadata.common.title || "", file.name),
			durationInMs: metadata.format.duration
				? Math.round(metadata.format.duration * 1000)
				: 0,
			unsolvedTrackCredits: trackParty.unsolved,
			trackCredits: trackParty.albumParty,
			trackVariantsIds: [blake3Hash],
		};

		newState.trackVariants[blake3Hash] = {
			id: blake3Hash,
			trackId,
			variantType: "Default",
			source: "MORA",
			fileRequest: {
				fileBlake3: blake3Hash,
				mimeType: file.type,
				fileSizeInBytes: file.size,
				container: file.type,
				extension: ext,
				originalFileName: file.name,
				codec: metadata.format.codec?.toUpperCase(),
				audioSampleRate: metadata.format.sampleRate,
				bitrate: Math.round(metadata.format.bitrate || 0),
				durationInMs: metadata.format.duration
					? Math.round(metadata.format.duration * 1000)
					: undefined,
			},
			file: file,
		};

		disc.OrderedTrackIds.push(trackId);
	}

	Object.values(newState.albums).forEach((album) => {
		album.OrderedAlbumDiscsIds.sort((a, b) => {
			return newState.discs[a].discNumber - newState.discs[b].discNumber;
		});
	});

	Object.values(newState.discs).forEach((disc) => {
		disc.OrderedTrackIds.sort((a, b) => {
			return newState.tracks[a].trackNumber - newState.tracks[b].trackNumber;
		});
	});

	return { newState, skipped };
}

export function makeMatchingKey(
	title: string,
	credits: components["schemas"]["AlbumCreditRequest"][],
	unsolvedArtists: string[],
): string {
	const t = normalizeString(title);

	const c = [...credits].map((x) => `${x.partyId}:${x.credit}`).join("|");

	const u = unsolvedArtists.map((a) => normalizeString(a)).join("|");

	return `${t}__${c}__${u}`;
}

export function buildMusicUploadRequest(state: UploadMusicState) {
	const albums: components["schemas"]["CreateAlbumRequest"][] = [];

	for (const albumId of state.albumIds) {
		const album = state.albums[albumId];
		const albumCover = state.albumCovers[albumId];

		const discs: components["schemas"]["AlbumDiscRequest"][] = [];

		for (const discId of album.OrderedAlbumDiscsIds) {
			const disc = state.discs[discId];
			const tracks: components["schemas"]["AlbumTrackRequest"][] = [];

			for (const trackId of disc.OrderedTrackIds) {
				const track = state.tracks[trackId];

				const trackVariants: components["schemas"]["TrackVariantRequest"][] =
					[];

				for (const trackVariantId of track.trackVariantsIds) {
					const trackVariant = state.trackVariants[trackVariantId];

					const trackSource: components["schemas"]["TrackSourceRequest"][] = [];

					trackSource.push({
						source: trackVariant.source,
						file: trackVariant.fileRequest,
					});

					trackVariants.push({
						variantType: trackVariant.variantType,
						sources: trackSource,
					});
				}

				tracks.push({
					title: track.title,
					description: track.description,
					trackNumber: track.trackNumber,
					isMC: track.isMC,
					durationInMs: track.durationInMs,
					trackCredits: track.trackCredits,
					trackVariants,
				});
			}

			discs.push({
				discNumber: disc.discNumber,
				subtitle: disc.subtitle,
				tracks,
			});
		}

		const albumImageRequest: components["schemas"]["AlbumImageRequest"] | undefined =
			albumCover
				? {
					file: albumCover.file,
				}
				: undefined;

		albums.push({
			title: album.title,
			description: album.description,
			type: album.type,
			releaseDate: album.releaseDate ? album.releaseDate : undefined,
			albumCredits: album.albumCredits,
			albumImage: albumImageRequest,
			discs,
		});
	}

	return albums;
}

function splitFile(file: File, partSize: number) {
	const parts = [];
	let start = 0;
	let partNumber = 1;

	while (start < file.size) {
		const end = Math.min(start + partSize, file.size);
		parts.push({ partNumber, blob: file.slice(start, end) });
		start = end;
		partNumber++;
	}
	return parts;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt: number, baseMs = 400, maxMs = 10_000) {
	const exp = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
	const jitter = Math.random() * 0.3 * exp;
	return Math.floor(exp + jitter);
}

async function uploadPartWithRetry(
	url: string,
	blob: Blob,
	partNumber: number,
	maxRetries = 5,
) {
	let attempt = 1;
	while (true) {
		try {
			const res = await fetch(url, { method: "PUT", body: blob });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const etag = res.headers.get("ETag");
			if (!etag) throw new Error("Missing ETag (check S3 CORS ExposeHeaders)");

			return { partNumber: partNumber, eTag: etag };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);

			if (attempt >= maxRetries) {
				throw new Error(
					`Part ${partNumber} failed after ${maxRetries} attempts: ${message}`,
				);
			}

			const delay = backoffDelay(attempt);
			console.warn(
				`Upload part ${partNumber} failed (attempt ${attempt}): ${message}. Retrying in ${delay}ms...`,
			);
			await sleep(delay);
			attempt++;
		}
	}
}

export async function multipartFileRequest(
	file: File,
	uploadInfo: components["schemas"]["MultipartUploadInfo"],
): Promise<components["schemas"]["CompleteMultipartUploadPart"][]> {
	const partSize = uploadInfo.partSizeInBytes;
	const parts = splitFile(file, Number(partSize));

	const results = await pMap(
		parts,
		async (part) => {
			const { partNumber, blob } = part;
			const url = uploadInfo.parts[partNumber - 1];

			return await uploadPartWithRetry(url.url, blob, partNumber, 5);
		},
		{ concurrency: 4 },
	);

	const sorted = results.sort((a, b) => a.partNumber - b.partNumber);

	return sorted;
}
