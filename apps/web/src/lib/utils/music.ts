export function checkIfMC(title: string, filename: string): boolean {
	const mcIndicators = ["mc", "m.c.", "m.c", "ＭＣ"];
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
