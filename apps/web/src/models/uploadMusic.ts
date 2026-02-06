import type { Crop, PixelCrop } from "react-image-crop";
import type { components } from "@/data/APIschema";

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

export type CreateAlbum = {
	title: string;
	description?: string;
	type: components["schemas"]["AlbumType"];
	languageId?: string;
	relaseDate?: string;

	unsolvedAlbumCredits: string[];
	albumCredits: components["schemas"]["AlbumCreditRequest"][];
	albumImage?: null | LocalImage;

	albumTracks: CreateTrack[];
};

export type CreateTrack = {
	trackNumber: number;
	discNumber: number;

	title: string;
	description?: string;
	languageId?: string;
	isrc?: string;
	durationInMs: number;

	unsolvedTrackCredits: string[];
	trackCredits: components["schemas"]["TrackCreditRequest"][];
	trackVariants: components["schemas"]["TrackVariantRequest"][];
};
