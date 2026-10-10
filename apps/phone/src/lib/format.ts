import type { FileObject } from "@/lib/schema";

type Numeric = number | string | null | undefined;

/** e.g. `1 track`, `3 tracks`. */
export function plural(
	count: Numeric,
	singular: string,
	pluralForm = `${singular}s`,
) {
	const value = Number(count);
	return `${value} ${value === 1 ? singular : pluralForm}`;
}

/** A total length such as an album or playlist, e.g. `1h 5m`. */
export function formatTotalDuration(durationInMs: Numeric) {
	const totalMinutes = Math.round(Number(durationInMs) / 60_000);
	if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes}m`;
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** A track length as `m:ss`, or `h:mm:ss` past an hour. */
export function formatTrackDuration(durationInMs: Numeric) {
	const totalSeconds = Math.round(Number(durationInMs) / 1000);
	if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
		: `${minutes}:${seconds}`;
}

// Release dates are calendar dates, so they are read in UTC to avoid shifting a day.
const releaseDateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

export function formatReleaseDate(value?: string | null) {
	return value ? releaseDateFormatter.format(new Date(value)) : null;
}

export function formatReleaseYear(value?: string | null) {
	return value ? String(new Date(value).getUTCFullYear()) : null;
}

const megabyte = 1024 * 1024;

export function formatFileSize(bytes: number) {
	if (bytes < megabyte) return `${Math.round(bytes / 1024)} KB`;
	if (bytes < 1024 * megabyte) {
		return `${(bytes / megabyte).toFixed(bytes < 10 * megabyte ? 1 : 0)} MB`;
	}
	return `${(bytes / (1024 * megabyte)).toFixed(1)} GB`;
}

export function formatExtension(file: FileObject) {
	return file.extension.replace(/^\./, "").toUpperCase();
}

function formatSampleRate(value: Numeric) {
	const sampleRate = Number(value);
	if (!value || !Number.isFinite(sampleRate)) return null;
	return sampleRate >= 1000 ? `${sampleRate / 1000} kHz` : `${sampleRate} Hz`;
}

function formatBitrate(value: Numeric) {
	const bitrate = Number(value);
	if (!value || !Number.isFinite(bitrate)) return null;
	return `${Math.round(bitrate / 1000)} kbps`;
}

function formatCodec(value: string | null | undefined) {
	const codec = value?.trim();
	if (!codec) return null;
	return codec.length <= 4
		? codec.toUpperCase()
		: codec[0].toUpperCase() + codec.slice(1);
}

/** The quality of an audio file like the web player shows it, e.g. `FLAC · 44.1 kHz · 16-bit · 912 kbps`. */
export function formatAudioFile(file: FileObject) {
	return [
		file.variant === "Opus96"
			? "Opus 96"
			: (formatCodec(file.codec) ?? formatExtension(file)),
		formatSampleRate(file.audioSampleRate),
		file.bitsPerSample ? `${file.bitsPerSample}-bit` : null,
		formatBitrate(file.bitrate),
	]
		.filter((part) => part !== null)
		.join(" · ");
}
