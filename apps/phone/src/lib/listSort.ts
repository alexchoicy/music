import type { components } from "@api/schema";

export type ListSortOption = components["schemas"]["ListSortOption"];

export const defaultListSort: ListSortOption = "TitleAsc";

export const listSortOptions: { label: string; value: ListSortOption }[] = [
	{ label: "Title A to Z", value: "TitleAsc" },
	{ label: "Title Z to A", value: "TitleDesc" },
	{ label: "Newest added", value: "CreatedAtDesc" },
	{ label: "Oldest added", value: "CreatedAtAsc" },
];
