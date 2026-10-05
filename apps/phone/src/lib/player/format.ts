import type { components } from "@api/schema";

type FileObjectDetails = components["schemas"]["FileObjectDetails"];
type Numeric = null | number | string | undefined;

// Formatting matches the web player's quality label.

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

function formatCodec(value: null | string | undefined) {
	const codec = value?.trim();
	if (!codec) return null;
	return codec.length <= 4
		? codec.toUpperCase()
		: codec[0].toUpperCase() + codec.slice(1);
}

/** e.g. `FLAC · 44.1 kHz · 16-bit · 912 kbps`. */
export function formatAudioFile(file: FileObjectDetails, isOpus96: boolean) {
	return [
		isOpus96
			? "Opus 96"
			: (formatCodec(file.codec) ??
				file.extension.replace(/^\./, "").toUpperCase()),
		formatSampleRate(file.audioSampleRate),
		file.bitsPerSample ? `${file.bitsPerSample}-bit` : null,
		formatBitrate(file.bitrate),
	]
		.filter((part) => part !== null)
		.join(" · ");
}
