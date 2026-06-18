import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxValue,
} from "#/components/coss/combobox";
import type { components } from "#/data/APIschema";
import { albumQueries } from "#/lib/queries/album.queries";
import { normalizeString } from "#/lib/utils/string";

type AlbumItem = components["schemas"]["AlbumListItem"];
type LinkedAlbumsComboboxId = number;

type LinkedAlbumsComboboxProps = {
	ariaLabel?: string;
	filterOutIds?: LinkedAlbumsComboboxId[];
	placeholder?: string;
	selectedIds: LinkedAlbumsComboboxId[];
	setSelectedIds: (selectedIds: LinkedAlbumsComboboxId[]) => void;
};

const EMPTY_FILTER_OUT_IDS: LinkedAlbumsComboboxId[] = [];

function albumMatchesQuery(album: AlbumItem, normalizedQuery: string): boolean {
	if (!normalizedQuery) return true;

	const values = [album.title, ...album.artists.map((artist) => artist.name)];

	return values.some((value) =>
		normalizeString(value).includes(normalizedQuery),
	);
}

export function LinkedAlbumsCombobox({
	ariaLabel = "Linked albums",
	filterOutIds = EMPTY_FILTER_OUT_IDS,
	placeholder = "Search and select albums...",
	selectedIds,
	setSelectedIds,
}: LinkedAlbumsComboboxProps) {
	const { data: albums } = useSuspenseQuery(albumQueries.getAlbums());
	const [query, setQuery] = useState("");
	const selectedIdKeys = new Set(selectedIds);
	const hiddenIdKeys = new Set([...selectedIds, ...filterOutIds]);
	const selectedAlbums = albums.filter((album) =>
		selectedIdKeys.has(Number(album.albumId)),
	);
	const normalizedQuery = normalizeString(query);
	const filteredAlbums = albums.filter(
		(album) =>
			!hiddenIdKeys.has(Number(album.albumId)) &&
			albumMatchesQuery(album, normalizedQuery),
	);

	return (
		<Combobox<AlbumItem, true>
			filter={null}
			inputValue={query}
			items={filteredAlbums}
			multiple
			onInputValueChange={setQuery}
			onValueChange={(nextValue) => {
				setSelectedIds(nextValue.map((album) => Number(album.albumId)));
				setQuery("");
			}}
			value={selectedAlbums}
		>
			<ComboboxChips aria-label={ariaLabel}>
				<ComboboxValue>
					{(value: AlbumItem[]) => (
						<>
							{value.map((album) => (
								<ComboboxChip
									key={album.albumId}
									removeProps={{
										"aria-label": `Remove ${album.title}`,
									}}
								>
									{album.title}
								</ComboboxChip>
							))}
							<ComboboxChipsInput
								aria-label={ariaLabel}
								placeholder={value.length > 0 ? "" : placeholder}
							/>
						</>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxPopup>
				<ComboboxEmpty>No albums found.</ComboboxEmpty>
				<ComboboxList>
					{(album: AlbumItem) => (
						<ComboboxItem key={album.albumId} value={album}>
							<span className="flex min-w-0 flex-col">
								<span className="truncate">{album.title}</span>
								<span className="truncate text-xs text-muted-foreground">
									{album.artists.map((artist) => artist.name).join(", ") ||
										"Unknown artist"}
								</span>
							</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}
