export function checkIfMC(title: string, filename: string): boolean {
	const mcIndicators = ["mc", "m.c.", "m.c", "ＭＣ", "talk"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return mcIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}

export function checkIfVariousArtists(artist: string[]): boolean {
	const variousIndicators = ["various artists", "va"];
	const lowerArtist = artist.map((a) => a.toLowerCase()).join(" ");
	return variousIndicators.some((indicator) => lowerArtist.includes(indicator));
}

export function checkIfIntro(title: string, filename: string): boolean {
	const introIndicators = ["intro"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return introIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}

export function checkIfInterlude(title: string, filename: string): boolean {
	const interludeIndicators = ["interlude", "Overture"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return interludeIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}

export function checkIfInstrumental(title: string, filename: string): boolean {
	const instrumentalIndicators = ["instrumental"];
	const lowerTitle = title.toLowerCase();
	const lowerFilename = filename.toLowerCase();
	return instrumentalIndicators.some(
		(indicator) =>
			lowerTitle.includes(indicator) || lowerFilename.includes(indicator),
	);
}
