import type * as API from "@music/api";

export function getConcertCoverUrl(
	image?: API.ImageFileVariants | null,
): string | null {
	return image?.imageWide1280x720?.url ?? image?.original?.url ?? null;
}
