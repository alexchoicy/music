export function normalizeString(input: string) {
	if (!input.trim()) return "";

	return input
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.trim();
}

export function getInitials(name: string) {
	return (
		name
			.trim()
			.split(/\s+/)
			.map((part) => part.charAt(0))
			.join("")
			.slice(0, 2)
			.toUpperCase() || "?"
	);
}
