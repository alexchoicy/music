import type { components } from "@/data/APIschema";
import type { AudioPlayerItem } from "@/models/audioPlayer";

export function checkIfMC(title: string, filename: string): boolean {
	const mcIndicators = ["mc", "m.c.", "m.c", "ＭＣ", "talk"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return mcIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}

export function checkIfVariousArtists(artist: string[]): boolean {
	const variousIndicators = ["various artists", "va"];
	const lowerArtist = artist.map((a) => a.toLowerCase()).join(" ");
	return variousIndicators.some((indicator) => lowerArtist.includes(indicator));
}

export function buildAudioPlayerItem(
	album: components["schemas"]["AlbumDetailsModel"],
) {
	const audioPlayerItems: AudioPlayerItem[] = [];

	album.discs.forEach((disc) => {
		disc.tracks.forEach((track) => {
			const item: AudioPlayerItem = {
				albumId: Number(album.albumId),
				albumTitle: album.title,
				albumCoverUrl: album.coverImageUrl || undefined,
				artists: track.credits.map((credit) => credit.name),
				durationInMs: Number(track.durationInMs),
				sources:
					track.trackVariants.find(
						(variant) => variant.variantType === "Default",
					)?.sources || [],
				trackId: Number(track.trackId),
				trackTitle: track.title,
			};
			audioPlayerItems.push(item);
		});
	});

	return audioPlayerItems;
}
