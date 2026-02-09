import type { Crop, PixelCrop } from "react-image-crop";
import type { components } from "@/data/APIschema";

// each file request has a blake3 ID so i will use that
export type LocalImage = {
	file: components["schemas"]["FileRequest"];
	description?: string;
	fileCroppedArea?: null | components["schemas"]["FileCroppedArea"];

	localFile: File;
	localURL: string;

	crop?: Crop; // UI crop (percent)
	pixelCrop?: PixelCrop; // final crop in pixels
	croppedFile?: File; // generated output for upload
	croppedURL?: string; // preview of cropped output
};

export type LocalID = string; // it is a crypto.randomUUID()
export type Blake3ID = string;
export type AlbumID = string; // it build by albumTitle - creditsNames

export type Album = {
	id: LocalID;
	albumMatchId: AlbumID;
	title: string;
	description?: string;

	type: components["schemas"]["AlbumType"];
	languageId?: string;
	releaseDate?: string;

	unsolvedAlbumCredits: string[];
	albumCredits: components["schemas"]["AlbumCreditRequest"][];

	OrderedAlbumDiscsIds: LocalID[];
};

export type Disc = {
	id: LocalID;
	albumId: LocalID;
	discNumber: number;
	subtitle?: string;
	OrderedTrackIds: LocalID[];
};

export type Track = {
	id: LocalID;
	discId: LocalID;

	trackNumber: number;
	title: string;
	description?: string;
	languageId?: string;
	isMC: boolean;
	durationInMs: number;

	unsolvedTrackCredits: string[];
	trackCredits: components["schemas"]["TrackCreditRequest"][];

	trackVariantsIds: Blake3ID[];
};

export type TrackVariant = {
	id: Blake3ID; // unique id
	trackId: LocalID;

	variantType: components["schemas"]["TrackVariantType"];
	source: components["schemas"]["TrackSource"];

	fileRequest: components["schemas"]["FileRequest"];
	file: File;
};

export type UploadMusicState = {
	albumIds: LocalID[]; // so it is used to forcing the order of albums, so when edit, it won't drop to last.
	albums: Record<LocalID, Album>;
	discs: Record<LocalID, Disc>;
	tracks: Record<LocalID, Track>;
	trackVariants: Record<Blake3ID, TrackVariant>;
	albumCovers: Record<LocalID, LocalImage>;
};
