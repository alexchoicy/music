import { useMemo, useState } from "react";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/shadcn/combobox";
import type { components } from "@/data/APIschema";
import { normalizeString } from "@/lib/utils/string";

type AlbumListItem = components["schemas"]["AlbumListItemModel"];

function getAlbumArtistsLabel(album: AlbumListItem) {
	if (album.artists.length === 0) {
		return "No artists";
	}

	return album.artists.map((artist) => artist.name).join(", ");
}

type Props = {
	albums: AlbumListItem[];
	selectedValues: AlbumListItem[];
	setSelectedValues: React.Dispatch<React.SetStateAction<AlbumListItem[]>>;
};

export default function ConcertAlbumCombobox({
	albums,
	selectedValues,
	setSelectedValues,
}: Props) {
	const [searchValue, setSearchValue] = useState("");
	const anchor = useComboboxAnchor();

	const filteredAlbums = useMemo(() => {
		const normalizedQuery = normalizeString(searchValue);

		if (normalizedQuery === "") {
			return albums;
		}

		return albums.filter(
			(album) =>
				normalizeString(album.title).includes(normalizedQuery) ||
				album.artists.some((artist) =>
					normalizeString(artist.name).includes(normalizedQuery),
				),
		);
	}, [albums, searchValue]);

	const items = useMemo(() => {
		const merged = new Map<string, AlbumListItem>();

		selectedValues.forEach((album) => {
			merged.set(String(album.albumId), album);
		});

		filteredAlbums.forEach((album) => {
			merged.set(String(album.albumId), album);
		});

		return Array.from(merged.values());
	}, [filteredAlbums, selectedValues]);

	return (
		<Combobox
			multiple
			filter={null}
			value={selectedValues}
			items={items}
			itemToStringLabel={(item: AlbumListItem) => item.title}
			onValueChange={(next: AlbumListItem[]) => {
				setSelectedValues(next);
				setSearchValue("");
			}}
			onInputValueChange={(nextSearchValue) => {
				setSearchValue(nextSearchValue);
			}}
			onOpenChangeComplete={(open) => {
				if (!open) {
					setSearchValue("");
				}
			}}
		>
			<ComboboxChips ref={anchor}>
				<ComboboxValue>
					{selectedValues.map((album) => (
						<ComboboxChip key={album.albumId}>{album.title}</ComboboxChip>
					))}
					<ComboboxChipsInput placeholder="Search albums" />
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxContent anchor={anchor}>
				<ComboboxEmpty>No albums found.</ComboboxEmpty>
				<ComboboxList>
					{(item: AlbumListItem) => (
						<ComboboxItem key={item.albumId} value={item}>
							<div className="flex flex-col">
								<span>{item.title}</span>
								<span className="text-muted-foreground text-xs">
									{getAlbumArtistsLabel(item)}
								</span>
							</div>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
