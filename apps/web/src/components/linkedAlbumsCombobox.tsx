import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
} from "#/components/coss/combobox";
import type { components } from "#/data/APIschema";
import { albumQueries } from "#/lib/queries/album.queries";

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
const SEARCH_DEBOUNCE_MS = 300;

export function LinkedAlbumsCombobox({
	ariaLabel = "Linked albums",
	filterOutIds = EMPTY_FILTER_OUT_IDS,
	placeholder = "Search and select albums...",
	selectedIds,
	setSelectedIds,
}: LinkedAlbumsComboboxProps) {
	const queryClient = useQueryClient();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const trimmedQuery = query.trim();
	const trimmedSearchQuery = debouncedQuery.trim();
	const cachedAlbums =
		queryClient.getQueryData<AlbumItem[]>(["albums", undefined]) ?? [];
	const {
		data: searchAlbums = [],
		isFetching: isSearching,
		isError: isSearchError,
	} = useQuery({
		...albumQueries.getAlbums(
			trimmedSearchQuery ? { Search: trimmedSearchQuery } : undefined,
		),
		placeholderData: keepPreviousData,
	});
	const isSearchPending = trimmedQuery !== trimmedSearchQuery || isSearching;
	const selectedIdKeys = new Set(selectedIds);
	const hiddenIdKeys = new Set([...selectedIds, ...filterOutIds]);
	const albums = Array.from(
		new Map(
			[...cachedAlbums, ...searchAlbums].map((album) => [
				Number(album.albumId),
				album,
			]),
		).values(),
	);
	const selectedAlbums = albums.filter((album) =>
		selectedIdKeys.has(Number(album.albumId)),
	);
	const filteredAlbums = searchAlbums.filter(
		(album) => !hiddenIdKeys.has(Number(album.albumId)),
	);

	useEffect(() => {
		if (filteredAlbums.length > 0) {
			setDebouncedQuery(query);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDebouncedQuery(query);
		}, SEARCH_DEBOUNCE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [filteredAlbums.length, query]);

	const showSearchingStatus = isSearchPending && filteredAlbums.length === 0;

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
				<ComboboxStatus>
					{showSearchingStatus
						? "Searching..."
						: isSearchError
							? "Unable to search albums."
							: null}
				</ComboboxStatus>
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
