import type { components } from "@api/schema";

export type AlbumType = components["schemas"]["AlbumType"];
export type ListSortOption = components["schemas"]["ListSortOption"];

export const albumTypes: AlbumType[] = [
	"Album",
	"Single",
	"Compilation",
	"Live",
	"Soundtrack",
	"Remix",
	"Other",
];

export const defaultListSort: ListSortOption = "TitleAsc";

export const listSortOptions: { label: string; value: ListSortOption }[] = [
	{ label: "Title A to Z", value: "TitleAsc" },
	{ label: "Title Z to A", value: "TitleDesc" },
	{ label: "Newest added", value: "CreatedAtDesc" },
	{ label: "Oldest added", value: "CreatedAtAsc" },
];

export function getAlbumCoverUrl(
	image?: components["schemas"]["ImageFileVariants"] | null,
) {
	return image?.imageCover1024x1024?.url ?? image?.original?.url ?? null;
}
