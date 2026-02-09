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

type ProcessedFileData = {
	file: File;
	blake3Hash: string;
	sha1Hash: string;
	metadata: IAudioMetadata;
};

export async function processFile(
	file: File,
): Promise<ProcessedFileData | null> {
	try {
		const { blake3Hash, sha1Hash } = await hashFileStream(file);
		const metadata = await parseBlob(file);
		return { file, blake3Hash, sha1Hash, metadata };
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

		const { file, blake3Hash, sha1Hash, metadata } = fileData;

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
