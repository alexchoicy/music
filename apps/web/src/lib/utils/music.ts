function normalizeSearchValue(value: string): string {
	return value.normalize("NFKC").trim().toLowerCase();
}

const MC_INDICATORS = ["mc", "m.c.", "m.c", "talk"].map(normalizeSearchValue);
const VARIOUS_ARTISTS_INDICATORS = ["various artists", "v/a", "va"].map(
	normalizeSearchValue,
);
const INTRO_INDICATORS = ["intro"].map(normalizeSearchValue);
const INTERLUDE_INDICATORS = ["interlude", "overture"].map(
	normalizeSearchValue,
);
const INSTRUMENTAL_INDICATORS = ["instrumental"].map(normalizeSearchValue);

function includesAny(value: string, indicators: string[]): boolean {
	const normalizedValue = normalizeSearchValue(value);

	return indicators.some((indicator) => normalizedValue.includes(indicator));
}

function includesSeparatedPhrase(value: string, indicators: string[]): boolean {
	const normalizedValue = ` ${normalizeSearchValue(value)} `;

	return indicators.some((indicator) =>
		normalizedValue.includes(` ${indicator} `),
	);
}

export function checkIfVariousArtists(artist: string): boolean {
	return includesSeparatedPhrase(artist, VARIOUS_ARTISTS_INDICATORS);
}

export function checkIfMC(title: string, filename: string): boolean {
	return (
		includesAny(title, MC_INDICATORS) || includesAny(filename, MC_INDICATORS)
	);
}

export function checkIfIntro(title: string, filename: string): boolean {
	return (
		includesAny(title, INTRO_INDICATORS) ||
		includesAny(filename, INTRO_INDICATORS)
	);
}

export function checkIfInterlude(title: string, filename: string): boolean {
	return (
		includesAny(title, INTERLUDE_INDICATORS) ||
		includesAny(filename, INTERLUDE_INDICATORS)
	);
}

export function checkIfInstrumental(title: string, filename: string): boolean {
	return (
		includesAny(title, INSTRUMENTAL_INDICATORS) ||
		includesAny(filename, INSTRUMENTAL_INDICATORS)
	);
}

export function formatDurationInHoursAndMinutes(
	durationInMs?: null | number | string,
) {
	const duration = Number(durationInMs);
	if (!Number.isFinite(duration) || duration <= 0) return null;

	const totalMinutes = Math.round(duration / 1000 / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;

	return `${hours}h ${minutes}m`;
}

export function formatDurationInHoursMinutesSeconds(
	durationInMs?: null | number | string,
) {
	const duration = Number(durationInMs);
	if (!Number.isFinite(duration) || duration <= 0) return null;

	const totalSeconds = Math.round(duration / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;

	return `${seconds}s`;
}

export function formatMsToTimer(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "0:00";

	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}

	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
