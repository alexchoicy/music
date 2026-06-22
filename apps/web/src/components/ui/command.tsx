import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CornerDownLeftIcon,
	Disc3Icon,
	MicVocalIcon,
	Music2Icon,
	UsersRoundIcon,
} from "lucide-react";
import { Fragment, useDeferredValue, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
	Command as CommandRoot,
	CommandDialog,
	CommandDialogPopup,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandFooter,
} from "#/components/coss/command";
import type { components } from "#/data/APIschema";
import { searchQueries } from "#/lib/queries/search.queries";
import { getCoverUrl } from "#/lib/utils/album";

import { Kbd, KbdGroup } from "../coss/kbd";

type SearchResult = components["schemas"]["SearchResult"];
type SearchItem =
	| { kind: "album"; value: SearchResult["albums"][number] }
	| {
			albumId: number | string;
			coverUrl: null | string;
			kind: "track";
			value: NonNullable<
				SearchResult["albums"][number]["matchedTracks"]
			>[number];
	  }
	| { kind: "concert"; value: SearchResult["concerts"][number] }
	| { kind: "party"; value: SearchResult["parties"][number] };
type TrackSearchItem = Extract<SearchItem, { kind: "track" }>;

type CommandProps = {
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

const emptySearchResult: SearchResult = {
	albums: [],
	concerts: [],
	parties: [],
};

function itemKey(item: SearchItem) {
	if (item.kind === "album") return `album-${item.value.albumId}`;
	if (item.kind === "track")
		return `track-${item.albumId}-${item.value.trackId}`;
	if (item.kind === "concert") return `concert-${item.value.concertId}`;
	return `party-${item.value.partyId}`;
}

function itemTitle(item: SearchItem) {
	if (item.kind === "track") return item.value.title;
	return item.kind === "party" ? item.value.name : item.value.title;
}

function itemSubtitle(item: SearchItem) {
	if (item.kind === "album") {
		return (
			item.value.artists.map((artist) => artist.name).join(", ") || "Album"
		);
	}

	if (item.kind === "concert") {
		return (
			item.value.parties.map((party) => party.name).join(", ") || "Concert"
		);
	}

	if (item.kind === "party") {
		return item.value.aliases.map((alias) => alias.name).join(", ") || "Party";
	}

	return "";
}

function itemIcon(item: SearchItem) {
	if (item.kind === "album") return <Disc3Icon aria-hidden="true" />;
	if (item.kind === "track") return <Music2Icon aria-hidden="true" />;
	if (item.kind === "concert") return <MicVocalIcon aria-hidden="true" />;
	return <UsersRoundIcon aria-hidden="true" />;
}

function itemCoverUrl(item: SearchItem) {
	if (item.kind === "album") return getCoverUrl(item.value.coverVariants);
	if (item.kind === "concert") return getCoverUrl(item.value.coverVariants);
	if (item.kind === "track") return item.coverUrl;
	return item.value.coverUrl || null;
}

export function Command({ onOpenChange, open }: CommandProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [highlightedItem, setHighlightedItem] = useState<SearchItem>();
	const deferredQuery = useDeferredValue(query.trim());
	const { data = emptySearchResult, isFetching } = useQuery({
		...searchQueries.getSearch(deferredQuery),
		enabled: open,
		placeholderData: keepPreviousData,
	});
	const albums: SearchItem[] = data.albums.map((value) => ({
		kind: "album",
		value,
	}));
	const albumTracks: TrackSearchItem[] = data.albums.flatMap((album) =>
		(album.matchedTracks ?? []).map((value) => {
			const discCover = album.discCovers?.find(
				(disc) => Number(disc.discNumber) === Number(value.discNumber),
			);

			return {
				albumId: album.albumId,
				coverUrl:
					getCoverUrl(discCover?.variants) ?? getCoverUrl(album.coverVariants),
				kind: "track" as const,
				value,
			};
		}),
	);
	const concerts: SearchItem[] = data.concerts.map((value) => ({
		kind: "concert",
		value,
	}));
	const parties: SearchItem[] = data.parties.map((value) => ({
		kind: "party",
		value,
	}));
	const items: SearchItem[] = [
		...albums,
		...albumTracks,
		...concerts,
		...parties,
	];

	function openItem(item: SearchItem) {
		onOpenChange(false);
		setQuery("");

		if (item.kind === "album") {
			void navigate({
				params: { id: String(item.value.albumId) },
				to: "/albums/$id",
			});
			return;
		}

		if (item.kind === "track") {
			void navigate({
				hash: `track-${item.value.trackId}`,
				params: { id: String(item.albumId) },
				to: "/albums/$id",
			});
			return;
		}

		if (item.kind === "concert") {
			void navigate({
				params: { id: String(item.value.concertId) },
				to: "/concerts/$id",
			});
			return;
		}

		void navigate({
			params: { id: String(item.value.partyId) },
			to: "/parties/$id",
		});
	}

	return (
		<CommandDialog onOpenChange={onOpenChange} open={open}>
			<CommandDialogPopup>
				<CommandRoot
					itemToStringValue={(item) => itemTitle(item as SearchItem)}
					items={items}
					mode="none"
					onItemHighlighted={(item) => {
						setHighlightedItem(item as SearchItem | undefined);
					}}
					onValueChange={setQuery}
					value={query}
				>
					<CommandInput
						onKeyDown={(event: ReactKeyboardEvent) => {
							if (event.key !== "Enter" || !highlightedItem) return;
							event.preventDefault();

							const item = items.find(
								(current) => itemKey(current) === itemKey(highlightedItem),
							);
							if (item) openItem(item);
						}}
						placeholder="Search albums, tracks, concerts, parties..."
					/>
					<CommandEmpty>
						{isFetching ? "Searching..." : "No results found."}
					</CommandEmpty>
					<CommandList>
						<SearchGroup
							items={albums}
							label="Albums"
							onOpenItem={openItem}
							trackItems={albumTracks}
						/>
						<SearchGroup
							items={concerts}
							label="Concerts"
							onOpenItem={openItem}
						/>
						<SearchGroup
							items={parties}
							label="Parties"
							onOpenItem={openItem}
						/>
					</CommandList>
				</CommandRoot>
				<CommandFooter>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<KbdGroup>
								<Kbd>
									<ArrowUpIcon />
								</Kbd>
								<Kbd>
									<ArrowDownIcon />
								</Kbd>
							</KbdGroup>
							<span>Navigate</span>
						</div>
						<div className="flex items-center gap-2">
							<Kbd>
								<CornerDownLeftIcon />
							</Kbd>
							<span>Open</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Kbd>Esc</Kbd>
						<span>Close</span>
					</div>
				</CommandFooter>
			</CommandDialogPopup>
		</CommandDialog>
	);
}

function SearchGroup({
	items,
	label,
	onOpenItem,
	trackItems = [],
}: {
	items: SearchItem[];
	label: string;
	onOpenItem: (item: SearchItem) => void;
	trackItems?: TrackSearchItem[];
}) {
	if (items.length === 0) return null;

	return (
		<CommandGroup>
			<CommandGroupLabel>{label}</CommandGroupLabel>
			{items.map((item) => {
				const coverUrl = itemCoverUrl(item);
				const albumTrackItems =
					item.kind === "album"
						? trackItems.filter(
								(trackItem) => trackItem.albumId === item.value.albumId,
							)
						: [];

				return (
					<Fragment key={itemKey(item)}>
						<CommandItem onClick={() => onOpenItem(item)} value={item}>
							<span className="me-2 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
								{coverUrl ? (
									<img
										alt=""
										className="h-full w-full object-cover"
										src={coverUrl}
									/>
								) : (
									itemIcon(item)
								)}
							</span>
							<span className="flex min-w-0 flex-col">
								<span className="truncate">{itemTitle(item)}</span>
								<span className="truncate text-xs text-muted-foreground">
									{itemSubtitle(item)}
								</span>
							</span>
						</CommandItem>
						{albumTrackItems.map((trackItem) => (
							<TrackCommandItem
								key={itemKey(trackItem)}
								onOpenItem={onOpenItem}
								trackItem={trackItem}
							/>
						))}
					</Fragment>
				);
			})}
		</CommandGroup>
	);
}

function TrackCommandItem({
	onOpenItem,
	trackItem,
}: {
	onOpenItem: (item: SearchItem) => void;
	trackItem: TrackSearchItem;
}) {
	const coverUrl = itemCoverUrl(trackItem);

	return (
		<CommandItem
			className="ms-7 me-1 mb-1 border border-border/60 bg-card/60 py-2 data-highlighted:border-primary/60 data-highlighted:bg-primary/10"
			onClick={() => onOpenItem(trackItem)}
			value={trackItem}
		>
			<span className="me-2 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/15 text-primary [&_svg]:size-3.5">
				{coverUrl ? (
					<img alt="" className="h-full w-full object-cover" src={coverUrl} />
				) : (
					itemIcon(trackItem)
				)}
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="flex items-center gap-2">
					<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
						{trackItem.value.discNumber}-
						{String(trackItem.value.trackNumber).padStart(2, "0")}
					</span>
					<span className="truncate text-sm font-medium">
						{trackItem.value.title}
					</span>
				</span>
				{trackItem.value.basedOnTrackTitle && (
					<span className="truncate text-[11px] text-muted-foreground">
						Based on {trackItem.value.basedOnTrackTitle}
					</span>
				)}
			</span>
		</CommandItem>
	);
}
