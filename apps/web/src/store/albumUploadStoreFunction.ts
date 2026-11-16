import type * as API from "@music/api";
import type { IAudioMetadata } from "music-metadata";

import { ALBUM_TITLE, TRACK_TITLE } from "#/constant/album";
import {
	checkIfInstrumental,
	checkIfInterlude,
	checkIfIntro,
	checkIfMC,
} from "#/lib/utils/music";
import { resolveParty } from "#/lib/utils/party";
import {
	createTrackAudioRequest,
	makeAlbumMatchingKey,
} from "#/lib/utils/upload";
import type { ProcessedFileData } from "#/lib/utils/upload";

import type {
	AlbumDraft,
	AlbumLocalId,
	AlbumUploadState,
	BulkUpdateTracksInput,
	CoverAsset,
	CoverAssetBlake3Hash,
	CreateAlbumRequest,
	DiscLocalId,
	MergeAlbumDraftInput,
	PartyItem,
	TrackLocalId,
	UpdateAlbumDraftInput,
	UpdateTrackDraftInput,
} from "./albumUploadStoreType";

export function buildAlbumRequests(
	state: AlbumUploadState,
): CreateAlbumRequest[] {
	return state.albumOrder.map((albumId) => {
		const album = state.albumsById[albumId];
		const hasMultipleDiscs = album.discIds.length > 1;
		const hasDiscSpecificCover =
			hasMultipleDiscs &&
			album.discIds.some((discId) => {
				const discCoverAssetIdByHash =
					state.discsById[discId].coverAssetIdByHash;

				return (
					discCoverAssetIdByHash &&
					discCoverAssetIdByHash !== album.coverAssetIdByHash
				);
			});

		return {
			clientTempAlbumId: album.clientTempAlbumId,
			title: album.title,
			description: album.description,
			type: album.type,
			languageId: album.languageId,
			releaseDate: album.releaseDate,
			credits: album.credits,
			image: album.coverAssetIdByHash
				? state.coverAssetsIdByHash[album.coverAssetIdByHash]?.imageRequest
				: null,
			discs: album.discIds.map((discId) => {
				const disc = state.discsById[discId];
				const discCoverAssetIdByHash =
					disc.coverAssetIdByHash ?? album.coverAssetIdByHash;

				return {
					discNumber: disc.discNumber,
					subtitle: disc.subtitle,
					image:
						hasDiscSpecificCover && discCoverAssetIdByHash
							? state.coverAssetsIdByHash[discCoverAssetIdByHash]?.imageRequest
							: null,
					tracks: disc.trackIds.map((trackId) => {
						const track = state.tracksById[trackId];

						return {
							clientTempTrackId: track.localId,
							trackNumber: track.trackNumber,
							title: track.title,
							description: track.description,
							durationInMs: track.durationInMs,
							languageId: track.languageId,
							contentType: track.contentType,
							versionType: track.versionType,
							basedOnTrackId: track.basedOnTrackId,
							credits: track.credits,
							audios: track.audios,
						};
					}),
				};
			}),
		};
	});
}

function getTrackContentType(
	title: string,
	fileName: string,
): API.TrackContentType {
	if (checkIfMC(title, fileName)) return "MC";
	if (checkIfInterlude(title, fileName)) return "Interlude";
	if (checkIfIntro(title, fileName)) return "Intro";
	return "Music";
}

function getTrackVersionType(
	title: string,
	fileName: string,
): API.TrackVersionType {
	return checkIfInstrumental(title, fileName) ? "Instrumental" : "Original";
}

function getMetadata(
	metadata: IAudioMetadata,
	file: File,
	parties: PartyItem[],
) {
	const albumTitle = metadata.common.album?.trim() || ALBUM_TITLE;
	const albumParty = resolveParty(metadata.common.albumartists ?? [], parties);
	const trackTitle = metadata.common.title?.trim() || TRACK_TITLE;
	const trackParty = resolveParty(metadata.common.artists ?? [], parties);

	const discNumber = metadata.common.disk.no ?? 1;
	const trackNumber = metadata.common.track.no ?? 1;
	const durationInMs = Math.round((metadata.format.duration ?? 0) * 1000);

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

function upsertCoverAsset(state: AlbumUploadState, coverAsset: CoverAsset) {
	if (Object.hasOwn(state.coverAssetsIdByHash, coverAsset.blake3Hash)) {
		const existingAsset = state.coverAssetsIdByHash[coverAsset.blake3Hash];

		if (existingAsset.localURL !== coverAsset.localURL) {
			URL.revokeObjectURL(coverAsset.localURL);
		}
		existingAsset.croppedArea = coverAsset.croppedArea;
		existingAsset.imageRequest.croppedArea =
			coverAsset.imageRequest.croppedArea;
		return existingAsset.blake3Hash;
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

function hasTrackAudio(state: AlbumUploadState, blake3Hash: string) {
	return Object.values(state.tracksById).some((track) =>
		track.audios.some((audio) => audio.file.blake3Hash === blake3Hash),
	);
}

export function insertPreparedFile(
	state: AlbumUploadState,
	fileData: ProcessedFileData,
	parties: PartyItem[],
) {
	if (hasTrackAudio(state, fileData.blake3Hash)) {
		if (fileData.cover) URL.revokeObjectURL(fileData.cover.localURL);
		return false;
	}

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
		const hadOneDisc = album.discIds.length === 1;

		discId = crypto.randomUUID();
		album.discIds.push(discId);

		if (hadOneDisc) {
			const firstDisc = state.discsById[album.discIds[0]];
			if (!firstDisc.coverAssetIdByHash) {
				firstDisc.coverAssetIdByHash = album.coverAssetIdByHash;
			}
		}

		state.discsById[discId] = {
			localId: discId,
			albumId,
			discNumber: metadata.discNumber,
			trackIds: [],
			subtitle: "",
			coverAssetIdByHash: album.discIds.length > 1 ? coverAssetId : null,
		};
	} else {
		const existingDisc = state.discsById[discId];
		if (
			album.discIds.length > 1 &&
			!existingDisc.coverAssetIdByHash &&
			coverAssetId
		) {
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

function cleanNewCoverAssets(
	state: AlbumUploadState,
	coverAssetIdByHash: CoverAssetBlake3Hash,
) {
	const isUsedByAlbum = Object.values(state.albumsById).some(
		(album) => album.coverAssetIdByHash === coverAssetIdByHash,
	);

	if (isUsedByAlbum) return;

	const isUsedByDisc = Object.values(state.discsById).some(
		(disc) => disc.coverAssetIdByHash === coverAssetIdByHash,
	);

	if (isUsedByDisc) return;

	URL.revokeObjectURL(state.coverAssetsIdByHash[coverAssetIdByHash].localURL);
	delete state.coverAssetsIdByHash[coverAssetIdByHash];
}

function moveTrackToDisc(
	state: AlbumUploadState,
	trackId: TrackLocalId,
	targetAlbumId: AlbumLocalId,
	targetDiscId: DiscLocalId,
) {
	const track = state.tracksById[trackId];
	track.albumId = targetAlbumId;
	track.discId = targetDiscId;
	state.discsById[targetDiscId].trackIds.push(trackId);
}

function mergeAlbumAsNewDisc(
	state: AlbumUploadState,
	sourceAlbum: AlbumDraft,
	targetAlbum: AlbumDraft,
	newDiscSubtitle: string,
) {
	const newDiscId = crypto.randomUUID();
	const nextDiscNumber =
		Math.max(
			0,
			...targetAlbum.discIds.map((discId) =>
				Number(state.discsById[discId].discNumber),
			),
		) + 1;
	let newDiscCoverAssetIdByHash = sourceAlbum.coverAssetIdByHash;

	for (const discId of sourceAlbum.discIds) {
		const coverAssetIdByHash = state.discsById[discId].coverAssetIdByHash;
		if (coverAssetIdByHash) {
			newDiscCoverAssetIdByHash = coverAssetIdByHash;
			break;
		}
	}

	state.discsById[newDiscId] = {
		localId: newDiscId,
		albumId: targetAlbum.localId,
		discNumber: nextDiscNumber,
		subtitle: newDiscSubtitle,
		coverAssetIdByHash: newDiscCoverAssetIdByHash,
		trackIds: [],
	};
	targetAlbum.discIds.push(newDiscId);

	for (const sourceDiscId of sourceAlbum.discIds) {
		const sourceDisc = state.discsById[sourceDiscId];

		for (const trackId of sourceDisc.trackIds) {
			moveTrackToDisc(state, trackId, targetAlbum.localId, newDiscId);
		}

		delete state.discsById[sourceDiscId];
	}

	sortAlbumDiscs(state, targetAlbum.localId);
	sortDiscTracks(state, newDiscId);
}

function mergeAlbumByDiscNumber(
	state: AlbumUploadState,
	sourceAlbum: AlbumDraft,
	targetAlbum: AlbumDraft,
) {
	for (const sourceDiscId of sourceAlbum.discIds) {
		const sourceDisc = state.discsById[sourceDiscId];
		const targetDiscId = findDiscByNumber(
			state,
			targetAlbum,
			Number(sourceDisc.discNumber),
		);

		if (!targetDiscId) {
			sourceDisc.albumId = targetAlbum.localId;

			for (const trackId of sourceDisc.trackIds) {
				state.tracksById[trackId].albumId = targetAlbum.localId;
			}

			targetAlbum.discIds.push(sourceDiscId);
			continue;
		}

		const targetDisc = state.discsById[targetDiscId];
		if (!targetDisc.subtitle && sourceDisc.subtitle) {
			targetDisc.subtitle = sourceDisc.subtitle;
		}

		const sourceDiscCoverAssetIdByHash = sourceDisc.coverAssetIdByHash;
		if (!targetDisc.coverAssetIdByHash && sourceDiscCoverAssetIdByHash) {
			targetDisc.coverAssetIdByHash = sourceDiscCoverAssetIdByHash;
		}

		for (const trackId of sourceDisc.trackIds) {
			moveTrackToDisc(state, trackId, targetAlbum.localId, targetDiscId);
		}

		delete state.discsById[sourceDiscId];
	}

	sortAlbumDiscs(state, targetAlbum.localId);
	for (const discId of targetAlbum.discIds) {
		sortDiscTracks(state, discId);
	}
}

export function mergeAlbumDraft(
	state: AlbumUploadState,
	sourceAlbumId: AlbumLocalId,
	input: MergeAlbumDraftInput,
) {
	if (sourceAlbumId === input.targetAlbumId) return;

	const sourceAlbum = state.albumsById[sourceAlbumId];
	const targetAlbum = state.albumsById[input.targetAlbumId];
	const coverAssetIdsToClean = new Set<CoverAssetBlake3Hash>();

	if (sourceAlbum.coverAssetIdByHash) {
		coverAssetIdsToClean.add(sourceAlbum.coverAssetIdByHash);
	}

	for (const discId of sourceAlbum.discIds) {
		const coverAssetIdByHash = state.discsById[discId].coverAssetIdByHash;
		if (coverAssetIdByHash) coverAssetIdsToClean.add(coverAssetIdByHash);
	}

	if (!targetAlbum.coverAssetIdByHash && sourceAlbum.coverAssetIdByHash) {
		targetAlbum.coverAssetIdByHash = sourceAlbum.coverAssetIdByHash;
	}

	if (input.mergeAsNewDisc) {
		mergeAlbumAsNewDisc(state, sourceAlbum, targetAlbum, input.newDiscSubtitle);
	} else {
		mergeAlbumByDiscNumber(state, sourceAlbum, targetAlbum);
	}

	delete state.albumsByMatchingKey[sourceAlbum.matchingKey];
	delete state.albumsById[sourceAlbum.localId];
	state.albumOrder = state.albumOrder.filter(
		(albumId) => albumId !== sourceAlbum.localId,
	);

	for (const coverAssetId of coverAssetIdsToClean) {
		cleanNewCoverAssets(state, coverAssetId);
	}
}

export function removeAlbumDraft(
	state: AlbumUploadState,
	albumId: AlbumLocalId,
) {
	if (!Object.hasOwn(state.albumsById, albumId)) return;

	const album = state.albumsById[albumId];
	const coverAssetIdsToClean = new Set<CoverAssetBlake3Hash>();

	if (album.coverAssetIdByHash) {
		coverAssetIdsToClean.add(album.coverAssetIdByHash);
	}

	for (const discId of album.discIds) {
		const disc = state.discsById[discId];

		if (disc.coverAssetIdByHash) {
			coverAssetIdsToClean.add(disc.coverAssetIdByHash);
		}

		for (const trackId of disc.trackIds) {
			delete state.tracksById[trackId];
		}

		delete state.discsById[discId];
	}

	delete state.albumsByMatchingKey[album.matchingKey];
	delete state.albumsById[album.localId];
	state.albumOrder = state.albumOrder.filter((id) => id !== album.localId);

	for (const coverAssetId of coverAssetIdsToClean) {
		cleanNewCoverAssets(state, coverAssetId);
	}

	if (state.albumOrder.length === 0 && state.submitStatus === "creating") {
		state.submitStatus = "idle";
	}
}

export function removeCreatedAlbumDraft(
	state: AlbumUploadState,
	albumId: AlbumLocalId,
) {
	if (!Object.hasOwn(state.albumsById, albumId)) return;

	const album = state.albumsById[albumId];
	const coverAssetIdsToClean = new Set<CoverAssetBlake3Hash>();

	if (album.coverAssetIdByHash) {
		coverAssetIdsToClean.add(album.coverAssetIdByHash);
	}

	for (const discId of album.discIds) {
		const disc = state.discsById[discId];

		if (disc.coverAssetIdByHash) {
			coverAssetIdsToClean.add(disc.coverAssetIdByHash);
		}

		for (const trackId of disc.trackIds) {
			delete state.tracksById[trackId];
		}

		delete state.discsById[discId];
	}

	delete state.albumsByMatchingKey[album.matchingKey];
	delete state.albumsById[album.localId];
	state.albumOrder = state.albumOrder.filter((id) => id !== album.localId);

	for (const coverAssetId of coverAssetIdsToClean) {
		cleanNewCoverAssets(state, coverAssetId);
	}
}

function moveTrackToDiscNumber(
	state: AlbumUploadState,
	trackId: TrackLocalId,
	discNumber: number,
) {
	const track = state.tracksById[trackId];
	const album = state.albumsById[track.albumId];
	const currentDisc = state.discsById[track.discId];
	let targetDiscId = findDiscByNumber(state, album, discNumber);

	if (!targetDiscId && currentDisc.trackIds.length === 1) {
		currentDisc.discNumber = discNumber;
		targetDiscId = currentDisc.localId;
	}

	if (!targetDiscId) {
		targetDiscId = crypto.randomUUID();
		album.discIds.push(targetDiscId);
		state.discsById[targetDiscId] = {
			localId: targetDiscId,
			albumId: album.localId,
			discNumber,
			subtitle: "",
			coverAssetIdByHash: null,
			trackIds: [],
		};
	}

	if (targetDiscId === track.discId) return;

	const sourceDisc = state.discsById[track.discId];
	const sourceDiscCoverAssetIdByHash = sourceDisc.coverAssetIdByHash;

	sourceDisc.trackIds = sourceDisc.trackIds.filter((id) => id !== trackId);
	moveTrackToDisc(state, trackId, album.localId, targetDiscId);

	if (sourceDisc.trackIds.length === 0) {
		delete state.discsById[sourceDisc.localId];
		album.discIds = album.discIds.filter((id) => id !== sourceDisc.localId);

		if (sourceDiscCoverAssetIdByHash) {
			cleanNewCoverAssets(state, sourceDiscCoverAssetIdByHash);
		}
	}
}

function sortAlbum(state: AlbumUploadState, albumId: AlbumLocalId) {
	sortAlbumDiscs(state, albumId);
	for (const discId of state.albumsById[albumId].discIds) {
		sortDiscTracks(state, discId);
	}
}

export function updateTrackDraft(
	state: AlbumUploadState,
	trackId: TrackLocalId,
	input: UpdateTrackDraftInput,
) {
	if (!Object.hasOwn(state.tracksById, trackId)) return;

	const track = state.tracksById[trackId];

	moveTrackToDiscNumber(state, trackId, input.discNumber);

	track.title = input.title;
	track.trackNumber = input.trackNumber;
	track.languageId = input.languageId;
	track.contentType = input.contentType;
	track.versionType = input.versionType;
	track.credits = input.credits;

	if (input.clearUnsolvedTrackCredits) {
		track.unsolvedCredits = [];
	}

	for (const audio of track.audios) {
		audio.source = input.source;
		audio.sourceUrl = input.sourceUrl ?? null;
	}

	sortAlbum(state, track.albumId);
}

export function bulkUpdateTracks(
	state: AlbumUploadState,
	trackIds: TrackLocalId[],
	input: BulkUpdateTracksInput,
) {
	const albumIds = new Set<AlbumLocalId>();

	for (const trackId of trackIds) {
		if (!Object.hasOwn(state.tracksById, trackId)) continue;

		const track = state.tracksById[trackId];
		albumIds.add(track.albumId);

		if (input.credits.mode === "replace") {
			track.credits = input.credits.credits;
		} else if (input.credits.mode === "add") {
			const existingPartyIds = new Set(
				track.credits.map((credit) => Number(credit.partyId)),
			);
			track.credits = [
				...track.credits,
				...input.credits.credits.filter(
					(credit) => !existingPartyIds.has(Number(credit.partyId)),
				),
			];
		} else if (input.credits.mode === "album") {
			track.credits = state.albumsById[track.albumId].credits;
		} else if (input.credits.mode === "clear") {
			track.credits = [];
		}

		if (input.clearUnsolvedCredits) track.unsolvedCredits = [];

		if (input.titleFind) {
			const title = track.title
				.replaceAll(input.titleFind, input.titleReplace)
				.trim();
			if (title) track.title = title;
		}

		if (input.languageId !== undefined) track.languageId = input.languageId;
		if (input.contentType !== undefined) track.contentType = input.contentType;
		if (input.versionType !== undefined) track.versionType = input.versionType;

		for (const audio of track.audios) {
			if (input.source !== undefined) audio.source = input.source;
			if (input.sourceUrl !== undefined) audio.sourceUrl = input.sourceUrl;
		}

		if (input.discNumber !== undefined) {
			moveTrackToDiscNumber(state, trackId, input.discNumber);
		}
	}

	if (!input.renumber) {
		for (const albumId of albumIds) sortAlbum(state, albumId);
		return;
	}

	// Moved tracks stay appended after the disc's own tracks, so numbering follows the list order
	for (const albumId of albumIds) sortAlbumDiscs(state, albumId);

	const discIds = new Set<DiscLocalId>();
	for (const trackId of trackIds) {
		if (Object.hasOwn(state.tracksById, trackId)) {
			discIds.add(state.tracksById[trackId].discId);
		}
	}

	for (const discId of discIds) {
		state.discsById[discId].trackIds.forEach((trackId, index) => {
			state.tracksById[trackId].trackNumber = index + 1;
		});
	}
}

export function removeTracks(
	state: AlbumUploadState,
	trackIds: TrackLocalId[],
) {
	for (const trackId of trackIds) {
		if (!Object.hasOwn(state.tracksById, trackId)) continue;

		const track = state.tracksById[trackId];
		const disc = state.discsById[track.discId];
		const album = state.albumsById[track.albumId];

		disc.trackIds = disc.trackIds.filter((id) => id !== trackId);
		delete state.tracksById[trackId];

		if (disc.trackIds.length > 0) continue;

		if (album.discIds.length === 1) {
			removeAlbumDraft(state, album.localId);
			continue;
		}

		const discCoverAssetIdByHash = disc.coverAssetIdByHash;
		album.discIds = album.discIds.filter((id) => id !== disc.localId);
		delete state.discsById[disc.localId];
		if (discCoverAssetIdByHash) {
			cleanNewCoverAssets(state, discCoverAssetIdByHash);
		}
	}
}

export function updateAlbumDraft(
	state: AlbumUploadState,
	albumId: AlbumLocalId,
	input: UpdateAlbumDraftInput,
) {
	const album = state.albumsById[albumId];

	const nextUnsolvedCredits = input.clearUnsolvedAlbumCredits
		? []
		: album.unsolvedCredits;

	const newMatchingKey = makeAlbumMatchingKey(
		input.title,
		input.credits,
		nextUnsolvedCredits,
	);

	if (newMatchingKey !== album.matchingKey) {
		const existingAlbumId = state.albumsByMatchingKey[newMatchingKey];

		if (existingAlbumId && existingAlbumId !== albumId) {
			mergeAlbumDraft(state, albumId, {
				targetAlbumId: existingAlbumId,
				mergeAsNewDisc: false,
				newDiscSubtitle: "",
			});
			return;
		} else {
			delete state.albumsByMatchingKey[album.matchingKey];
			state.albumsByMatchingKey[newMatchingKey] = albumId;
			album.matchingKey = newMatchingKey;
		}
	}

	album.title = input.title;
	album.credits = input.credits;
	album.unsolvedCredits = nextUnsolvedCredits;

	if (input.cover) {
		const oldCoverAssetIdByHash = album.coverAssetIdByHash;
		const coverAssetIdByHash = upsertCoverAsset(state, input.cover);
		album.coverAssetIdByHash = coverAssetIdByHash;
		if (oldCoverAssetIdByHash)
			cleanNewCoverAssets(state, oldCoverAssetIdByHash);
	}

	album.type = input.type;
	album.languageId = input.languageId;
	album.releaseDate = input.releaseDate;

	for (const [discId, cover] of Object.entries(input.discCoversById)) {
		if (!Object.hasOwn(state.discsById, discId)) continue;

		const disc = state.discsById[discId];
		if (disc.albumId !== albumId) continue;

		const oldCoverAssetIdByHash = disc.coverAssetIdByHash;

		if (cover) {
			const coverAssetIdByHash = upsertCoverAsset(state, cover);
			disc.coverAssetIdByHash = coverAssetIdByHash;
		} else {
			disc.coverAssetIdByHash = null;
		}

		if (oldCoverAssetIdByHash)
			cleanNewCoverAssets(state, oldCoverAssetIdByHash);
	}

	for (const [discId, subtitle] of Object.entries(input.discSubtitlesById)) {
		if (!Object.hasOwn(state.discsById, discId)) continue;

		const disc = state.discsById[discId];
		if (disc.albumId === albumId) disc.subtitle = subtitle;
	}
}

export function getTrackIssues(state: AlbumUploadState) {
	const issues: Record<TrackLocalId, string> = {};

	for (const disc of Object.values(state.discsById)) {
		const countByNumber = new Map<number, number>();

		for (const trackId of disc.trackIds) {
			const trackNumber = Number(state.tracksById[trackId].trackNumber);
			countByNumber.set(trackNumber, (countByNumber.get(trackNumber) ?? 0) + 1);
		}

		for (const trackId of disc.trackIds) {
			const track = state.tracksById[trackId];
			if ((countByNumber.get(Number(track.trackNumber)) ?? 0) > 1) {
				issues[trackId] = "Duplicate number";
			}
		}
	}

	return issues;
}
