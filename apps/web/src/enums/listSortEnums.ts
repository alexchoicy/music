import type { components } from "#/data/APIschema";
import type { EnumOption } from "#/enums/utils";

export type ListSortOption = components["schemas"]["ListSortOption"];

export const DEFAULT_LIST_SORT: ListSortOption = "TitleAsc";

export const LIST_SORT_OPTIONS: EnumOption<ListSortOption>[] = [
	{ label: "Title/name A to Z", value: "TitleAsc" },
	{ label: "Title/name Z to A", value: "TitleDesc" },
	{ label: "Created newest", value: "CreatedAtDesc" },
	{ label: "Created oldest", value: "CreatedAtAsc" },
];

const LIST_SORT_VALUES = new Set(
	LIST_SORT_OPTIONS.map((option) => option.value),
);

export function isListSortOption(value: unknown): value is ListSortOption {
	return (
		typeof value === "string" && LIST_SORT_VALUES.has(value as ListSortOption)
	);
}
