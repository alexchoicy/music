import type * as API from "@music/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
	ComboboxStatus,
	ComboboxValue,
} from "#/components/base/combobox";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { albumQueries } from "#/lib/queries/album.queries";

type AlbumComboboxProps = {
	ariaLabel: string;
	placeholder?: string;
	selectedIds: number[];
	setSelectedIds: (selectedIds: number[]) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function AlbumCombobox({
	ariaLabel,
	placeholder = "Search albums...",
	selectedIds,
	setSelectedIds,
}: AlbumComboboxProps) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS).trim();

	const { data: allAlbums = [] } = useQuery(albumQueries.getAlbums());
	const {
		data: searchResults = [],
		isError,
		isFetching,
	} = useQuery({
		...albumQueries.getAlbums(
			debouncedQuery ? { Search: debouncedQuery } : undefined,
		),
		placeholderData: keepPreviousData,
	});

	const albumById = new Map(
		[...allAlbums, ...searchResults].map((album) => [
			Number(album.albumId),
			album,
		]),
	);
	const selected = selectedIds
		.map((albumId) => albumById.get(albumId))
		.filter((album): album is API.AlbumListItem => album !== undefined);
	const selectedIdSet = new Set(selectedIds);
	const results = searchResults.filter(
		(album) => !selectedIdSet.has(Number(album.albumId)),
	);
	const isSearching = query.trim() !== debouncedQuery || isFetching;

	return (
		<Combobox<API.AlbumListItem, true>
			filter={null}
			inputValue={query}
			items={results}
			itemToStringLabel={(album) => album.title}
			multiple
			onInputValueChange={setQuery}
			onValueChange={(next) => {
				setSelectedIds(next.map((album) => Number(album.albumId)));
				setQuery("");
			}}
			value={selected}
		>
			<ComboboxChips>
				<ComboboxValue>
					{(value: API.AlbumListItem[]) => (
						<>
							{value.map((album) => (
								<ComboboxChip
									key={album.albumId}
									removeProps={{ "aria-label": `Remove ${album.title}` }}
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
			<ComboboxPopup className="w-(--anchor-width)">
				<ComboboxStatus>
					{isSearching && results.length === 0
						? "Searching…"
						: isError
							? "Unable to search albums."
							: null}
				</ComboboxStatus>
				<ComboboxEmpty>No albums found.</ComboboxEmpty>
				<ComboboxList>
					{(album: API.AlbumListItem) => (
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
