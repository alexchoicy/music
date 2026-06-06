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
