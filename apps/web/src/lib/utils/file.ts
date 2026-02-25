export async function getDimensions(file: Blob) {
	const bitmap = await createImageBitmap(file);

	const result = {
		width: bitmap.width,
		height: bitmap.height,
	};

	bitmap.close();
	return result;
}

export const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",

	"audio/mpeg": "mp3",
	"audio/flac": "flac",
	"audio/wav": "wav",
	"audio/ogg": "ogg",
};

export function extFromFilename(name: string): string | undefined {
	const match = name.match(/\.([^.]+)$/);
	return match?.[1]?.toLowerCase();
}

export function resolveExtension(file: File): string {
	const mimeExt = MIME_TO_EXT[file.type];
	if (mimeExt) return mimeExt;

	const nameExt = extFromFilename(file.name);
	if (nameExt) return nameExt;

	return "bin";
}
