import type * as API from "@music/api";
import pmap from "p-map";

import { toastManager } from "#/components/base/toast";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { shareUrl } from "#/lib/utils/browser";
import { getPresignedDownloadUrl } from "#/store/audioPlayer/audioPlayerFunction";

export type AlbumDetails = API.AlbumDetails;
export type AlbumTrack = API.AlbumTrackDetails;
export type PartyCredit =
	| AlbumDetails["credits"][number]
	| AlbumTrack["credits"][number];

export function getAlbumHoverCoverUrl(album: AlbumDetails) {
	return getAlbumCoverUrl(album.cover.discs[1]?.variants);
}

export function getCreditNames(credits: PartyCredit[]) {
	return credits.map((credit) => credit.name).join(", ");
}

export function getTrackCredits(album: AlbumDetails) {
	const credits = new Map<string, PartyCredit>();
	const albumCredits = new Set(
		album.credits.map((credit) => `${credit.partyId}-${credit.creditType}`),
	);

	for (const disc of album.discs) {
		for (const track of disc.tracks) {
			for (const credit of track.credits) {
				const key = `${credit.partyId}-${credit.creditType}`;
				if (!albumCredits.has(key)) credits.set(key, credit);
			}
		}
	}

	return Array.from(credits.values());
}

export function getContentTypeLabel(contentType: AlbumTrack["contentType"]) {
	return contentType === "MC" ? "Talk" : contentType;
}

type AlbumDownloadFile = {
	url: string;
	extension: string;
};

export type AlbumDownloadType = "source" | "tagged" | "opus";
type AlbumAudioFile =
	AlbumDetails["discs"][number]["tracks"][number]["audios"][number]["file"];

type AlbumDownloadTrack = {
	fileName: string;
	url: string;
};

function normalizeFileName(fileName: string) {
	return (
		Array.from(fileName.normalize("NFKC"))
			.filter((char) => char >= " ")
			.join("")
			.replace(/[<>:"/\\|?*]/g, "-")
			.replace(/\s+/g, " ")
			.replace(/[. ]+$/g, "")
			.slice(0, 240) || "track"
	);
}

function getDownloadLabel(fileType: AlbumDownloadType) {
	switch (fileType) {
		case "source":
			return "source";
		case "tagged":
			return "tagged original";
		case "opus":
			return "opus";
	}
}

function getDownloadFile(
	file: AlbumAudioFile,
	fileType: AlbumDownloadType,
): AlbumDownloadFile | undefined {
	switch (fileType) {
		case "source":
			return file.original;
		case "tagged":
			return file.taggedOriginal!;
		case "opus":
			return file.opus96!;
	}
}

export async function downloadAlbum(
	album: AlbumDetails,
	fileType: AlbumDownloadType,
) {
	const presignUrls: AlbumDownloadTrack[] = [];

	for (const disc of album.discs) {
		for (const track of disc.tracks) {
			const pinAudio = track.audios.find((audio) => audio.pinned);
			if (!pinAudio) continue;

			const file = getDownloadFile(pinAudio.file, fileType);
			const label = getDownloadLabel(fileType);

			if (!file) {
				toastManager.add({
					title: `No ${label} available`,
					description: `${track.title} has no ${label} URL available`,
					type: "error",
				});
				continue;
			}

			const presign = await getPresignedDownloadUrl(file.url);
			if (!presign) {
				toastManager.add({
					title: `No ${label} available`,
					description: `${track.title} has no ${label} URL available`,
					type: "error",
				});
				continue;
			}

			presignUrls.push({
				fileName: normalizeFileName(
					`${disc.discNumber} - ${track.trackNumber} ${track.title}.${file.extension}`,
				),
				url: presign,
			});
		}
	}

	if (presignUrls.length === 0) return;

	const toastId = toastManager.add({
		title: "Preparing download",
		description: `0/${presignUrls.length} tracks downloaded.`,
		type: "loading",
	});

	try {
		const { total } = await download(presignUrls, (done, count, fileName) => {
			toastManager.update(toastId, {
				title: "Downloading album",
				description: `${done}/${count} saved: ${fileName}`,
				type: "loading",
			});
		});

		toastManager.update(toastId, {
			title: "Download successful",
			description: `${total} tracks downloaded.`,
			type: "success",
		});
	} catch (error) {
		toastManager.update(toastId, {
			title: "Download failed",
			description:
				error instanceof Error ? error.message : "Something went wrong.",
			type: "error",
		});
	}
}

async function download(
	presignUrls: AlbumDownloadTrack[],
	onProgress: (done: number, total: number, fileName: string) => void,
) {
	let total = 0;

	if ("showDirectoryPicker" in window) {
		const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
		await pmap(
			presignUrls,
			async (track) => {
				const res = await fetch(track.url);
				if (!res.ok) throw new Error(`Failed to download ${track.fileName}`);
				const data = await res.arrayBuffer();
				const fileHandle = await dirHandle.getFileHandle(track.fileName, {
					create: true,
				});
				const writable = await fileHandle.createWritable();
				await writable.write(data);
				await writable.close();
				total += 1;
				onProgress(total, presignUrls.length, track.fileName);
			},
			{ concurrency: 5 },
		);
	} else {
		for (const track of presignUrls) {
			const iframe = document.createElement("iframe");
			iframe.style.display = "none";
			iframe.src = track.url;

			document.body.appendChild(iframe);
			setTimeout(() => iframe.remove(), 5 * 60 * 1000);
			total += 1;
			onProgress(total, presignUrls.length, track.fileName);
		}
	}

	return { total };
}

export async function downloadTrackFile(
	album: AlbumDetails,
	trackName: string,
	source: string,
	fileUrl: string,
) {
	const presignUrl = await getPresignedDownloadUrl(fileUrl);

	if (!presignUrl) {
		toastManager.add({
			type: "error",
			title: "File Download Failed",
			description: `Failed to download ${trackName}.`,
		});
		return;
	}

	const anchor = document.createElement("a");
	anchor.href = presignUrl;
	anchor.click();
	anchor.remove();

	toastManager.add({
		title: "Downloaded",
		description: `${album.title} - ${trackName} - ${source}`,
	});
}

export async function shareAlbumLink(album: AlbumDetails, trackId?: string) {
	const url = new URL(album.shareUrl);
	const track = trackId
		? album.discs
				.flatMap((disc) => disc.tracks)
				.find((item) => String(item.trackId) === trackId)
		: undefined;
	if (track) url.searchParams.set("track", String(track.trackId));

	const result = await shareUrl({
		title: track?.title ?? album.title,
		text: track
			? `${track.title} from ${album.title}`
			: album.credits.map((credit) => credit.name).join(", "),
		url: url.toString(),
	});

	if (result === "copied") {
		toastManager.add({
			title: "Link copied",
			description: `${track?.title ?? album.title} share link copied.`,
		});
	}
}
