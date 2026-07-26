import { useHotkey } from "@tanstack/react-hotkeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Disc3Icon, SearchIcon } from "lucide-react";
import { useDeferredValue, useRef } from "react";
import { z } from "zod";

import { Checkbox } from "#/components/coss/checkbox";
import { Field, FieldLabel } from "#/components/coss/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Label } from "#/components/coss/label";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { NewAlbumTile } from "#/components/new/NewMedia";
import {
	NewEmptyState,
	NewFilterPanel,
	NewMediaSkeleton,
	NewPage,
	NewPageHeader,
} from "#/components/new/NewPage";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import {
	DEFAULT_LIST_SORT,
	isListSortOption,
	LIST_SORT_OPTIONS,
} from "#/enums/listSortEnums";
import type { ListSortOption } from "#/enums/listSortEnums";
import { albumQueries } from "#/lib/queries/album.queries";
import type { AlbumQuery } from "#/lib/queries/album.queries";
import { languageQueries } from "#/lib/queries/language.queries";

type AlbumTypeFilter = (typeof ALBUM_TYPE_OPTIONS)[number]["value"];
type AlbumSearch = {
	includeTrackCredit: boolean;
	languageIds: number[];
	partyIds: number[];
	search: string;
	sort: ListSortOption;
	types: AlbumTypeFilter[];
};
const ALBUM_TYPE_VALUES = new Set<string>(
	ALBUM_TYPE_OPTIONS.map((option) => option.value),
);
const albumSearchSchema = z
	.object({
		includeTrackCredit: z.boolean().catch(false).default(false),
		languageIds: z
			.array(z.coerce.number().int().positive())
			.catch([])
			.default([]),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
		sort: z
			.custom<ListSortOption>(isListSortOption)
			.catch(DEFAULT_LIST_SORT)
			.default(DEFAULT_LIST_SORT),
		types: z
			.array(
				z.custom<AlbumTypeFilter>(
					(value) => typeof value === "string" && ALBUM_TYPE_VALUES.has(value),
				),
			)
			.catch([])
			.default([]),
	})
	.transform(
		(search): AlbumSearch => ({
			...search,
			includeTrackCredit:
				search.partyIds.length > 0 && search.includeTrackCredit,
		}),
	);
const defaults: AlbumSearch = {
	includeTrackCredit: false,
	languageIds: [],
	partyIds: [],
	search: "",
	sort: DEFAULT_LIST_SORT,
	types: [],
};

export const Route = createFileRoute("/new/_authed/albums/")({
	validateSearch: albumSearchSchema,
	search: { middlewares: [stripSearchParams(defaults)] },
	component: RouteComponent,
});

function RouteComponent() {
	const filters = Route.useSearch();
	const deferred = useDeferredValue(filters);
	const navigate = useNavigate({ from: Route.fullPath });
	const searchRef = useRef<HTMLInputElement>(null);
	const query: AlbumQuery = {
		IsIncludeInTrackCredit:
			deferred.partyIds.length && deferred.includeTrackCredit
				? true
				: undefined,
		LanguageIds: deferred.languageIds.length ? deferred.languageIds : undefined,
		PartyIds: deferred.partyIds.length ? deferred.partyIds : undefined,
		Search: deferred.search || undefined,
		Sort: deferred.sort,
		Types: deferred.types.length ? deferred.types : undefined,
	};
	const {
		data: albums = [],
		isError,
		isPending,
		refetch,
	} = useQuery({
		...albumQueries.getAlbums(query),
		placeholderData: keepPreviousData,
	});
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const update = (next: Partial<AlbumSearch>) =>
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...next }),
		});
	useHotkey("Control+F", () => searchRef.current?.focus());
	useHotkey("R", () => update(defaults));

	const controls = (
		<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.2fr)_minmax(14rem,1.4fr)_minmax(10rem,.8fr)_minmax(10rem,.8fr)_minmax(10rem,.8fr)] lg:items-end">
			<InputGroup>
				<InputGroupAddon>
					<SearchIcon />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search albums"
					onChange={(event) => update({ search: event.target.value })}
					placeholder="Search albums…"
					ref={searchRef}
					type="search"
					value={filters.search}
				/>
			</InputGroup>
			<Field>
				<div className="flex items-center justify-between gap-2">
					<FieldLabel nativeLabel={false} render={<div />}>
						Artist
					</FieldLabel>
					<span className="flex items-center gap-2">
						<Checkbox
							checked={
								filters.partyIds.length > 0 && filters.includeTrackCredit
							}
							disabled={!filters.partyIds.length}
							id="new-album-track-credit"
							onCheckedChange={(checked) =>
								update({ includeTrackCredit: checked === true })
							}
						/>
						<Label className="text-xs" htmlFor="new-album-track-credit">
							Track credits
						</Label>
					</span>
				</div>
				<PartyCombobox
					ariaLabel="Filter by artists"
					placeholder="All artists"
					selectedIds={filters.partyIds}
					setSelectedIds={(partyIds) =>
						update({
							partyIds,
							includeTrackCredit:
								partyIds.length > 0 && filters.includeTrackCredit,
						})
					}
				/>
			</Field>
			<EnumFieldSelect
				label="Type"
				multiple
				onValueChange={(types) => update({ types })}
				options={ALBUM_TYPE_OPTIONS}
				placeholder="All types"
				value={filters.types}
			/>
			<EnumFieldSelect
				label="Language"
				multiple
				onValueChange={(ids) => update({ languageIds: ids.map(Number) })}
				options={languages.map((item) => ({
					label: item.language,
					value: String(item.id),
				}))}
				placeholder="All languages"
				value={filters.languageIds.map(String)}
			/>
			<EnumFieldSelect
				label="Sort"
				onValueChange={(sort) => update({ sort })}
				options={LIST_SORT_OPTIONS}
				value={filters.sort}
			/>
		</div>
	);

	return (
		<NewPage>
			<NewPageHeader
				description="Browse the full release catalog and filter by artist, type, language, or track credit."
				eyebrow="Collection"
				title="Albums"
			/>
			<NewFilterPanel>{controls}</NewFilterPanel>
			{isPending ? (
				<NewMediaSkeleton rows={12} />
			) : isError ? (
				<NewEmptyState
					description="The album catalog could not be loaded."
					icon={<Disc3Icon />}
					onRetry={() => void refetch()}
					title="Unable to load albums"
				/>
			) : albums.length ? (
				<section
					aria-label={`${albums.length} albums`}
					className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
				>
					{albums.map((album) => (
						<NewAlbumTile album={album} key={album.albumId} />
					))}
				</section>
			) : (
				<NewEmptyState
					description="Try broadening the filters, or add the first release to this collection."
					icon={<Disc3Icon />}
					title="No albums found"
				/>
			)}
		</NewPage>
	);
}
