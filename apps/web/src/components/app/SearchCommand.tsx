import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CornerDownLeftIcon,
	Disc3Icon,
	MicVocalIcon,
	Music2Icon,
	SearchIcon,
	SearchXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Button } from "#/components/base/button";
import {
	Command,
	CommandDialog,
	CommandDialogPopup,
	CommandEmpty,
	CommandFooter,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/base/command";
import { Kbd, KbdGroup } from "#/components/base/kbd";
import { Skeleton } from "#/components/base/skeleton";
import { Spinner } from "#/components/base/spinner";
import type { components } from "#/data/APIschema";
import { COUNTRY_CODE, PARTY_TYPE } from "#/enums/partyEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { useTitleLang } from "#/hooks/use-title-lang";
import { searchQueries } from "#/lib/queries/search.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { getConcertCoverUrl } from "#/lib/utils/concert";
import { getInitials } from "#/lib/utils/string";
import { cn } from "#/lib/utils/styles";

type Album = components["schemas"]["AlbumListItem"];
type MatchedTrack = NonNullable<Album["matchedTracks"]>[number];
type Concert = components["schemas"]["ConcertListItem"];
type Party = components["schemas"]["PartyItems"];
type SearchResult = components["schemas"]["SearchResult"];

type SearchItem =
	| { kind: "album"; value: Album }
	| { kind: "track"; album: Album; value: MatchedTrack }
	| { kind: "concert"; value: Concert }
	| { kind: "party"; value: Party };
type AlbumItem = Extract<SearchItem, { kind: "album" }>;
type TrackItem = Extract<SearchItem, { kind: "track" }>;
type ConcertItem = Extract<SearchItem, { kind: "concert" }>;
type PartyItem = Extract<SearchItem, { kind: "party" }>;

type SearchCommandProps = {
	initialQuery?: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

const SEARCH_DEBOUNCE_MS = 300;
// Browsing with an empty query shows a preview; a search shows every match.
const BROWSE_RESULTS_PER_GROUP = 10;

function itemKey(item: SearchItem) {
	if (item.kind === "album") return `album-${item.value.albumId}`;
	if (item.kind === "track")
		return `track-${item.album.albumId}-${item.value.trackId}`;
	if (item.kind === "concert") return `concert-${item.value.concertId}`;
	return `party-${item.value.partyId}`;
}

function itemTitle(item: SearchItem) {
	return item.kind === "party" ? item.value.name : item.value.title;
}

function yearOf(value: null | string | undefined) {
	return value ? String(new Date(value).getUTCFullYear()) : null;
}

function countLabel(count: number | string, noun: string, plural = `${noun}s`) {
	const value = Number(count);
	return `${value} ${value === 1 ? noun : plural}`;
}

function joinMeta(parts: (null | string | undefined)[]) {
	return parts.filter(Boolean).join(" · ");
}

function buildSearchItems(result: SearchResult | undefined) {
	const albums: AlbumItem[] = (result?.albums ?? []).map((value) => ({
		kind: "album",
		value,
	}));
	const tracksByAlbum = new Map<Album["albumId"], TrackItem[]>(
		albums.map(({ value: album }) => [
			album.albumId,
			(album.matchedTracks ?? []).map((value) => ({
				album,
				kind: "track",
				value,
			})),
		]),
	);
	const concerts: ConcertItem[] = (result?.concerts ?? []).map((value) => ({
		kind: "concert",
		value,
	}));
	const parties: PartyItem[] = (result?.parties ?? []).map((value) => ({
		kind: "party",
		value,
	}));
	const items: SearchItem[] = [
		...albums.flatMap((album) => [
			album,
			...(tracksByAlbum.get(album.value.albumId) ?? []),
		]),
		...concerts,
		...parties,
	];
	return { albums, concerts, items, parties, tracksByAlbum };
}

export function SearchCommand({
	initialQuery,
	onOpenChange,
	open,
}: SearchCommandProps) {
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [highlightedKey, setHighlightedKey] = useState<string>();
	const trimmedQuery = query.trim();
	const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
	const { data, isError, isFetching, refetch } = useQuery({
		...searchQueries.getSearch(
			debouncedQuery,
			debouncedQuery ? 0 : BROWSE_RESULTS_PER_GROUP,
		),
		enabled: open,
		placeholderData: keepPreviousData,
	});
	const isSearching = trimmedQuery !== debouncedQuery || isFetching;
	// Kept-previous results belong to an older query once a search fails.
	const result = isError ? undefined : data;

	// Base UI compares items by identity, so they must stay stable between
	// renders or highlighting loops.
	const { albums, concerts, items, parties, tracksByAlbum } = useMemo(
		() => buildSearchItems(result),
		[result],
	);

	useEffect(() => {
		if (initialQuery === undefined) return;
		setQuery(initialQuery);
	}, [initialQuery]);

	useEffect(() => {
		if (!open) return;

		requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	}, [open]);

	function openItem(item: SearchItem) {
		onOpenChange(false);

		if (item.kind === "album") {
			void navigate({
				params: { id: String(item.value.albumId) },
				to: "/albums/$id",
			});
			return;
		}

		if (item.kind === "track") {
			void navigate({
				params: { id: String(item.album.albumId) },
				search: { track: Number(item.value.trackId) },
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

	function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (
			event.key !== "Enter" ||
			event.nativeEvent.isComposing ||
			event.nativeEvent.keyCode === 229 ||
			!highlightedKey
		)
			return;
		event.preventDefault();

		const item = items.find((current) => itemKey(current) === highlightedKey);
		if (item) openItem(item);
	}

	let status = "";
	if (isSearching) status = "Searching…";
	else if (isError) status = "Search failed.";
	else if (result)
		status = [
			countLabel(result.albumTotal, "album"),
			countLabel(result.concertTotal, "concert"),
			countLabel(result.partyTotal, "party", "parties"),
		].join(", ");

	return (
		<CommandDialog onOpenChange={onOpenChange} open={open}>
			<CommandDialogPopup
				aria-label="Search library"
				className="h-120 max-h-full"
			>
				<Command
					itemToStringValue={(item) => itemTitle(item as SearchItem)}
					items={items}
					mode="none"
					onItemHighlighted={(item) => {
						setHighlightedKey(item ? itemKey(item as SearchItem) : undefined);
					}}
					onValueChange={setQuery}
					value={query}
				>
					<CommandInput
						aria-label="Search library"
						onKeyDown={handleInputKeyDown}
						placeholder="Search albums, tracks, concerts, parties"
						ref={inputRef}
						startAddon={
							isSearching ? <Spinner role={undefined} /> : <SearchIcon />
						}
					/>
					<CommandEmpty className="flex min-h-0 flex-1 flex-col">
						{isError && !isSearching ? (
							<SearchState
								action={
									<Button
										onClick={() => void refetch()}
										size="sm"
										variant="outline"
									>
										Try again
									</Button>
								}
								description="The library couldn't be searched. Check your connection and try again."
								icon={<TriangleAlertIcon />}
								title="Search failed"
							/>
						) : isSearching ? (
							<SearchSkeleton />
						) : trimmedQuery ? (
							<SearchState
								description="Try a different spelling, an alias, or fewer words."
								icon={<SearchXIcon />}
								title={`No results for “${trimmedQuery}”`}
							/>
						) : (
							<SearchState
								description="Albums, concerts, and parties appear here once they're added."
								icon={<SearchIcon />}
								title="Your library is empty"
							/>
						)}
					</CommandEmpty>
					<CommandList aria-busy={isSearching}>
						{albums.length > 0 && (
							<CommandGroup>
								<GroupLabel
									label="Albums"
									shown={albums.length}
									total={result?.albumTotal}
								/>
								{albums.map((album) => (
									<Fragment key={itemKey(album)}>
										<AlbumRow item={album} onOpenItem={openItem} />
										{tracksByAlbum.get(album.value.albumId)?.map((track) => (
											<TrackRow
												item={track}
												key={itemKey(track)}
												onOpenItem={openItem}
											/>
										))}
									</Fragment>
								))}
							</CommandGroup>
						)}
						{concerts.length > 0 && (
							<CommandGroup>
								<GroupLabel
									label="Concerts"
									shown={concerts.length}
									total={result?.concertTotal}
								/>
								{concerts.map((concert) => (
									<ConcertRow
										item={concert}
										key={itemKey(concert)}
										onOpenItem={openItem}
									/>
								))}
							</CommandGroup>
						)}
						{parties.length > 0 && (
							<CommandGroup>
								<GroupLabel
									label="Parties"
									shown={parties.length}
									total={result?.partyTotal}
								/>
								{parties.map((party) => (
									<PartyRow
										item={party}
										key={itemKey(party)}
										onOpenItem={openItem}
									/>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
				<span aria-live="polite" className="sr-only" role="status">
					{status}
				</span>
				<CommandFooter className="max-sm:hidden">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<KbdGroup>
								<Kbd>
									<ArrowUpIcon aria-label="Up" />
								</Kbd>
								<Kbd>
									<ArrowDownIcon aria-label="Down" />
								</Kbd>
							</KbdGroup>
							<span>Navigate</span>
						</div>
						<div className="flex items-center gap-2">
							<Kbd>
								<CornerDownLeftIcon aria-label="Enter" />
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

function GroupLabel({
	label,
	shown,
	total,
}: {
	label: string;
	shown: number;
	total?: number | string;
}) {
	const count = Number(total ?? shown);

	return (
		<CommandGroupLabel>
			<span className="flex items-baseline justify-between gap-2">
				<span>{label}</span>
				<span className="font-normal tabular-nums">
					{count > shown ? `${shown} of ${count}` : count}
				</span>
			</span>
		</CommandGroupLabel>
	);
}

function SearchState({
	action,
	description,
	icon,
	title,
}: {
	action?: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-4 text-center">
			<span className="text-muted-foreground [&_svg]:size-8" aria-hidden="true">
				{icon}
			</span>
			<div className="flex max-w-xs flex-col gap-1">
				<p className="text-base font-semibold break-words text-foreground">
					{title}
				</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			{action}
		</div>
	);
}

function SearchSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-1 p-2">
			<Skeleton className="mx-2 my-1.5 h-3 w-16" />
			{Array.from({ length: 5 }, (_, index) => (
				<div className="flex items-center gap-3 px-2 py-1.5" key={index}>
					<Skeleton className="size-10 shrink-0" />
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<Skeleton className="h-3.5 w-2/5" />
						<Skeleton className="h-3 w-1/4" />
					</div>
				</div>
			))}
		</div>
	);
}

function ResultRow({
	artwork,
	item,
	meta,
	onOpenItem,
	titleLang,
}: {
	artwork: ReactNode;
	item: SearchItem;
	meta: string;
	onOpenItem: (item: SearchItem) => void;
	titleLang?: string;
}) {
	const title = itemTitle(item);

	return (
		<CommandItem variant="media" onClick={() => onOpenItem(item)} value={item}>
			{artwork}
			<span className="flex min-w-0 flex-col">
				<span
					className="truncate text-sm font-medium"
					lang={titleLang}
					title={title}
				>
					{title}
				</span>
				{meta && (
					<span className="truncate text-xs text-muted-foreground" title={meta}>
						{meta}
					</span>
				)}
			</span>
		</CommandItem>
	);
}

function Artwork({
	className,
	fallback,
	url,
}: {
	className: string;
	fallback: ReactNode;
	url: null | string;
}) {
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground [&_svg]:size-4",
				className,
			)}
		>
			{url ? (
				<img
					alt=""
					className="size-full object-cover"
					loading="lazy"
					src={url}
				/>
			) : (
				fallback
			)}
		</span>
	);
}

function AlbumRow({
	item,
	onOpenItem,
}: {
	item: AlbumItem;
	onOpenItem: (item: SearchItem) => void;
}) {
	const titleLang = useTitleLang();
	const album = item.value;
	const meta = joinMeta([
		album.artists.map((artist) => artist.name).join(", "),
		album.type === "Album" ? null : album.type,
		yearOf(album.releaseDate),
	]);

	return (
		<ResultRow
			artwork={
				<Artwork
					className="size-10"
					fallback={<Disc3Icon aria-hidden="true" />}
					url={getAlbumCoverUrl(album.coverVariants)}
				/>
			}
			item={item}
			meta={meta}
			onOpenItem={onOpenItem}
			titleLang={titleLang(album.languageId)}
		/>
	);
}

function TrackRow({
	item,
	onOpenItem,
}: {
	item: TrackItem;
	onOpenItem: (item: SearchItem) => void;
}) {
	const track = item.value;
	const position = `${track.discNumber}-${String(track.trackNumber).padStart(2, "0")}`;

	return (
		<CommandItem
			className="ms-13"
			variant="media"
			onClick={() => onOpenItem(item)}
			value={item}
		>
			<span className="flex min-w-12 shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
				<Music2Icon aria-hidden="true" className="size-3 shrink-0" />
				<span className="sr-only">Track </span>
				{position}
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-sm" title={track.title}>
					{track.title}
				</span>
				{track.basedOnTrackTitle && (
					<span
						className="truncate text-xs text-muted-foreground"
						title={`Based on ${track.basedOnTrackTitle}`}
					>
						Based on {track.basedOnTrackTitle}
					</span>
				)}
			</span>
		</CommandItem>
	);
}

function ConcertRow({
	item,
	onOpenItem,
}: {
	item: ConcertItem;
	onOpenItem: (item: SearchItem) => void;
}) {
	const concert = item.value;
	const meta = joinMeta([
		concert.parties.map((party) => party.name).join(", "),
		yearOf(concert.date),
	]);

	return (
		<ResultRow
			artwork={
				<Artwork
					className="aspect-video h-10"
					fallback={<MicVocalIcon aria-hidden="true" />}
					url={getConcertCoverUrl(concert.coverVariants)}
				/>
			}
			item={item}
			meta={meta}
			onOpenItem={onOpenItem}
		/>
	);
}

function PartyRow({
	item,
	onOpenItem,
}: {
	item: PartyItem;
	onOpenItem: (item: SearchItem) => void;
}) {
	const party = item.value;
	const meta = joinMeta([
		party.aliases.map((alias) => alias.name).join(", "),
		party.type ? PARTY_TYPE[party.type] : null,
		party.country === "XX" ? null : COUNTRY_CODE[party.country],
	]);

	return (
		<ResultRow
			artwork={
				<Avatar size="md">
					{party.coverUrl && (
						<AvatarImage alt="" loading="lazy" src={party.coverUrl} />
					)}
					<AvatarFallback>{getInitials(party.name)}</AvatarFallback>
				</Avatar>
			}
			item={item}
			meta={meta}
			onOpenItem={onOpenItem}
		/>
	);
}
