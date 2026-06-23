import type { components } from "#/data/APIschema";

export function getAlbumCoverUrl(
	image?: components["schemas"]["ImageFileVariants"] | null,
): string | null {
	return image?.imageCover1024x1024?.url ?? image?.original?.url ?? null;
}
