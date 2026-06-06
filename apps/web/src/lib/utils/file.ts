export async function getDimensions(file: Blob) {
	const bitmap = await createImageBitmap(file);

	const result = {
		width: bitmap.width,
		height: bitmap.height,
	};

	bitmap.close();
	return result;
}

export function formatDuration(durationInMs: number) {
	if (durationInMs <= 0) return null;

	const totalSeconds = Math.round(durationInMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const mimeToExtension: Record<string, string> = {
	"audio/flac": "flac",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/ogg": "ogg",
	"audio/opus": "opus",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
	"image/bmp": "bmp",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export function getExtensionFromMimeType(mimeType: string) {
	return mimeToExtension[mimeType.toLowerCase()] ?? "";
}
