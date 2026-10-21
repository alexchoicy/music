import type * as API from "@music/api";

export function getAlbumCoverUrl(
	image?: API.ImageFileVariants | null,
): string | null {
	return image?.imageCover1024x1024?.url ?? image?.original?.url ?? null;
}
