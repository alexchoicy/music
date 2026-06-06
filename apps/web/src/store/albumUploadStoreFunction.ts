import type { IAudioMetadata } from "music-metadata";

import {
	ALBUM_TITLE,
	DEFAULT_TRACK_AUDIO_SOURCE,
	TRACK_TITLE,
} from "#/constant/album";
import type { components } from "#/data/APIschema";
import { getExtensionFromMimeType } from "#/lib/utils/file";
import {
	checkIfInstrumental,
	checkIfInterlude,
	checkIfIntro,
	checkIfMC,
} from "#/lib/utils/music";
import { resolveParty } from "#/lib/utils/party";
import { makeAlbumMatchingKey } from "#/lib/utils/upload";
import type { ProcessedFileData } from "#/lib/utils/upload";

import type {
	AlbumDraft,
	AlbumLocalId,
	AlbumUploadState,
	CoverAsset,
	DiscLocalId,
	PartyItem,
} from "./albumUploadStoreType";

export function getTrackContentType(
	title: string,
	fileName: string,
): components["schemas"]["TrackContentType"] {
	if (checkIfMC(title, fileName)) return "MC";
	if (checkIfInterlude(title, fileName)) return "Interlude";
	if (checkIfIntro(title, fileName)) return "Intro";
	return "Music";
}

export function getTrackVersionType(
	title: string,
	fileName: string,
): components["schemas"]["TrackVersionType"] {
	return checkIfInstrumental(title, fileName) ? "Instrumental" : "Original";
}

function getMetadata(
	metadata: IAudioMetadata,
	file: File,
	parties: PartyItem[],
) {
	const albumTitle = metadata.common?.album?.trim() || ALBUM_TITLE;
	const albumParty = resolveParty(metadata.common.albumartists ?? [], parties);
	const trackTitle = metadata.common?.title?.trim() || TRACK_TITLE;
	const trackParty = resolveParty(metadata.common.artists ?? [], parties);

	const discNumber = metadata.common?.disk?.no ?? 1;
	const trackNumber = metadata.common?.track?.no ?? 1;
	const durationInMs = (metadata.format?.duration ?? 0) * 1000;

	const trackContentType = getTrackContentType(trackTitle, file.name);
	const trackVersionType = getTrackVersionType(trackTitle, file.name);

	const albumMatchingKey = makeAlbumMatchingKey(
		albumTitle,
		albumParty.albumParty,
		albumParty.unsolved,
	);

	return {
		albumTitle,
		albumParty,
		albumMatchingKey,
		trackTitle,
		trackParty,
		discNumber,
		trackNumber,
		durationInMs,
		trackContentType,
		trackVersionType,
	};
}

export function upsertCoverAsset(
	state: AlbumUploadState,
	coverAsset: CoverAsset,
) {
	const existingId = state.coverAssetsIdByHash[coverAsset.blake3Hash];

	if (existingId) {
		URL.revokeObjectURL(coverAsset.localURL);
		return existingId.blake3Hash;
	}

	state.coverAssetsIdByHash[coverAsset.blake3Hash] = coverAsset;

	return coverAsset.blake3Hash;
}

function findDiscByNumber(
	state: AlbumUploadState,
	album: AlbumDraft,
	discNumber: number,
) {
	return album.discIds.find((discId) => {
		const disc = state.discsById[discId];
		return Number(disc.discNumber) === discNumber;
	});
}

export function createTrackAudioRequest(
	fileData: ProcessedFileData,
	durationInMs: number,
): components["schemas"]["TrackAudioRequest"] {
	const extension = getExtensionFromMimeType(fileData.file.type);

	return {
		file: {
			blake3Hash: fileData.blake3Hash,
			mimeType: fileData.file.type,
			sizeInBytes: fileData.file.size,
			container:
				fileData.metadata.format.container?.trim().toLowerCase() || extension,
			extension: extension,
			codec: fileData.metadata.format.codec?.trim().toLowerCase() ?? null,
			width: null,
			height: null,
			audioSampleRate: fileData.metadata.format.sampleRate ?? null,
			bitrate: fileData.metadata.format.bitrate ?? null,
			frameRate: null,
			durationInMs,
			originalFileName: fileData.file.name,
		},
		rank: 0,
		pinned: true,
		source: DEFAULT_TRACK_AUDIO_SOURCE,
		sourceUrl: null,
	};
}

export function insertPreparedFile(
	state: AlbumUploadState,
	fileData: ProcessedFileData,
	parties: PartyItem[],
) {
	if (state.filesByBlake3Hash[fileData.blake3Hash]) {
		if (fileData.cover) URL.revokeObjectURL(fileData.cover.localURL);
		return false;
	}

	state.filesByBlake3Hash[fileData.blake3Hash] = {
		blake3Hash: fileData.blake3Hash,
		file: fileData.file,
		metadata: fileData.metadata,
	};

	const metadata = getMetadata(fileData.metadata, fileData.file, parties);

	const coverAssetId = fileData.cover
		? upsertCoverAsset(state, fileData.cover)
		: null;

	let albumId = state.albumsByMatchingKey[metadata.albumMatchingKey];

	if (!albumId) {
		albumId = crypto.randomUUID();

		state.albumsByMatchingKey[metadata.albumMatchingKey] = albumId;

		state.albumsById[albumId] = {
			localId: albumId,
			clientTempAlbumId: albumId,
			title: metadata.albumTitle,
			description: "",
			type: "Album",
			languageId: null,
			releaseDate: null,
			credits: metadata.albumParty.albumParty,
			matchingKey: metadata.albumMatchingKey,
			unsolvedCredits: metadata.albumParty.unsolved,
			hasVariousArtists: metadata.albumParty.hasVariousArtists,
			coverAssetIdByHash: coverAssetId,
			discIds: [],
		};
		state.albumOrder.push(albumId);
	} else {
		const existingAlbum = state.albumsById[albumId];
		if (!existingAlbum.coverAssetIdByHash && coverAssetId) {
			existingAlbum.coverAssetIdByHash = coverAssetId;
		}
	}

	const album = state.albumsById[albumId];

	let discId = findDiscByNumber(state, album, metadata.discNumber);

	if (!discId) {
		discId = crypto.randomUUID();
		album.discIds.push(discId);
		state.discsById[discId] = {
			localId: discId,
			albumId,
			discNumber: metadata.discNumber,
			trackIds: [],
			subtitle: "",
			coverAssetIdByHash: coverAssetId,
		};
	} else {
		const existingDisc = state.discsById[discId];
		if (!existingDisc.coverAssetIdByHash && coverAssetId) {
			existingDisc.coverAssetIdByHash = coverAssetId;
		}
	}

	const disc = state.discsById[discId];

	const trackId = crypto.randomUUID();
	//TODO: have a matchingKey here too i think. so more audio can added with this too.
	state.tracksById[trackId] = {
		localId: trackId,
		discId: discId,
		albumId,
		title: metadata.trackTitle,
		credits: metadata.trackParty.albumParty,
		unsolvedCredits: metadata.trackParty.unsolved,
		trackNumber: metadata.trackNumber,
		description: "",
		durationInMs: metadata.durationInMs,
		contentType: metadata.trackContentType,
		versionType: metadata.trackVersionType,
		basedOnTrackId: null,
		hasVariousArtists: metadata.albumParty.hasVariousArtists,
		audios: [createTrackAudioRequest(fileData, metadata.durationInMs)],
	};
	disc.trackIds.push(trackId);

	sortAlbumDiscs(state, albumId);
	sortDiscTracks(state, discId);

	return true;
}

function sortAlbumDiscs(state: AlbumUploadState, albumId: AlbumLocalId) {
	const album = state.albumsById[albumId];

	album.discIds.sort((a, b) => {
		const discA = state.discsById[a];
		const discB = state.discsById[b];
		return Number(discA.discNumber) - Number(discB.discNumber);
	});
}

function sortDiscTracks(state: AlbumUploadState, discId: DiscLocalId) {
	const disc = state.discsById[discId];

	disc.trackIds.sort((a, b) => {
		const trackA = state.tracksById[a];
		const trackB = state.tracksById[b];
		const numberA = Number(trackA.trackNumber);
		const numberB = Number(trackB.trackNumber);

		if (numberA === 0 && numberB !== 0) return 1;
		if (numberA !== 0 && numberB === 0) return -1;
		return numberA - numberB;
	});
}
