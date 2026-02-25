export function normalizeString(input: string) {
	if (!input?.trim()) return "";

	return input
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.trim();
}
