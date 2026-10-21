import type * as API from "@music/api";

import { MEDIA_SOURCE } from "#/enums/albumEnums";
import { autoSelectPlaybackQuality } from "#/store/audioPlayer/audioPlayerStore";
import type {
	AudioPlayerState,
	AudioPlayerTrack,
} from "#/store/audioPlayer/audioPlayerType";

type FileObject = API.FileObjectDetails;

export type QualityTier = "Hi-Res" | "Lossless" | "Original" | "Opus 96";

const LOSSLESS_CODECS = new Set([
	"flac",
	"alac",
	"pcm",
	"wav",
	"aiff",
	"ape",
	"wavpack",
	"dsd",
]);

function isLossless(file: FileObject) {
	const codec = file.codec?.trim().toLowerCase() ?? "";
	return (
		LOSSLESS_CODECS.has(codec) ||
		codec.startsWith("pcm") ||
		codec.startsWith("dsd") ||
		LOSSLESS_CODECS.has(file.extension.toLowerCase()) ||
		file.extension.toLowerCase() === "dsf"
	);
}

function toNumber(value: null | number | string | undefined) {
	if (value === null || value === undefined || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function formatCodec(value: null | string | undefined): string | null {
	const codec = value?.trim();
	if (!codec) return null;
	if (codec.length <= 4) return codec.toUpperCase();
	return codec[0]?.toUpperCase() + codec.slice(1);
}

function formatSize(bytes: number | null) {
	if (bytes === null) return null;
	if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export type NowPlayingQuality = {
	tier: QualityTier;
	stats: { label: string; value: string }[];
};

// Mirrors the store's source choice: Opus 96 when selected (or Auto picks it),
// and always for DSF, which browsers cannot play.
export function getNowPlayingQuality(
	track: AudioPlayerTrack,
	playbackQuality: AudioPlayerState["playbackQuality"],
): NowPlayingQuality {
	const selected =
		playbackQuality === "Auto" ? autoSelectPlaybackQuality() : playbackQuality;
	const original = track.audio.file.original;
	const opus96 = track.audio.file.opus96;
	const useOpus =
		Boolean(opus96) &&
		(selected === "Opus96" || original.extension.toLowerCase() === "dsf");
	const file = useOpus && opus96 ? opus96 : original;

	const sampleRate = toNumber(file.audioSampleRate);
	const bitDepth = toNumber(file.bitsPerSample);
	const bitrate = toNumber(file.bitrate);
	const tier: QualityTier = useOpus
		? "Opus 96"
		: !isLossless(file)
			? "Original"
			: (sampleRate ?? 0) > 48_000 || (bitDepth ?? 0) > 16
				? "Hi-Res"
				: "Lossless";

	const stats = [
		{
			label: "Format",
			value: formatCodec(file.codec) ?? file.extension.toUpperCase(),
		},
		{
			label: "Sample rate",
			value: sampleRate === null ? null : `${sampleRate / 1000} kHz`,
		},
		{ label: "Bit depth", value: bitDepth ? `${bitDepth}-bit` : null },
		{
			label: "Bitrate",
			value: bitrate === null ? null : `${Math.round(bitrate / 1000)} kbps`,
		},
		{ label: "Stream", value: useOpus ? "Opus 96 copy" : "Original file" },
		{
			label: "Source",
			value:
				track.audio.source === "UserUpload"
					? "Uploaded"
					: MEDIA_SOURCE[track.audio.source],
		},
		{ label: "Size", value: formatSize(toNumber(file.sizeInBytes)) },
	].filter((stat): stat is { label: string; value: string } =>
		Boolean(stat.value),
	);

	return { tier, stats };
}
