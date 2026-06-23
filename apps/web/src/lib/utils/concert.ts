import type { components } from "#/data/APIschema";

export function getConcertCoverUrl(
	image?: components["schemas"]["ImageFileVariants"] | null,
): string | null {
	return image?.imageWide1280x720?.url ?? image?.original?.url ?? null;
}
