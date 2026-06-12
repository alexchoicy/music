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

export function formatFileSize(sizeInBytes: number | string) {
	const size = Number(sizeInBytes);
	if (!Number.isFinite(size) || size <= 0) return null;

	const units = ["B", "KB", "MB", "GB"];
	let value = size;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const mimeToExtension: Record<string, string> = {
	"audio/aac": "aac",
	"audio/flac": "flac",
	"audio/mp4": "m4a",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/ogg": "ogg",
	"audio/opus": "opus",
	"audio/vnd.wave": "wav",
	"audio/wav": "wav",
	"audio/wave": "wav",
	"audio/x-aac": "aac",
	"audio/x-flac": "flac",
	"audio/x-m4a": "m4a",
	"audio/x-wav": "wav",
	"image/bmp": "bmp",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/x-png": "png",
};

export function getExtensionFromMimeType(mimeType: string) {
	return mimeToExtension[mimeType.toLowerCase()] ?? "";
}

export function getExtensionFromFileName(fileName: string) {
	const index = fileName.lastIndexOf(".");
	return index >= 0 ? fileName.slice(index + 1).trim().toLowerCase() : "";
}
