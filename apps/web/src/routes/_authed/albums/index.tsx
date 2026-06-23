import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { ChevronDownIcon, Disc3Icon, SearchIcon } from "lucide-react";
import { useDeferredValue } from "react";
import { z } from "zod";

import { AlbumCard } from "#/components/AlbumCard";
import { Card, CardPanel } from "#/components/coss/card";
import { Checkbox } from "#/components/coss/checkbox";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/coss/collapsible";
import { Field, FieldLabel } from "#/components/coss/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Label } from "#/components/coss/label";
import { Skeleton } from "#/components/coss/skeleton";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
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

const ALBUM_TYPE_VALUES: ReadonlySet<string> = new Set(
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

const albumSearchDefaults: AlbumSearch = {
	includeTrackCredit: false,
	languageIds: [],
	partyIds: [],
	search: "",
	sort: DEFAULT_LIST_SORT,
	types: [],
};

export const Route = createFileRoute("/_authed/albums/")({
	validateSearch: albumSearchSchema,
	search: {
		middlewares: [stripSearchParams(albumSearchDefaults)],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const filters = Route.useSearch();
	const deferredFilters = useDeferredValue(filters);
	const albumQuery: AlbumQuery = {
		IsIncludeInTrackCredit:
			deferredFilters.partyIds.length && deferredFilters.includeTrackCredit
				? true
				: undefined,
		LanguageIds: deferredFilters.languageIds.length
			? deferredFilters.languageIds
			: undefined,
		PartyIds: deferredFilters.partyIds.length
			? deferredFilters.partyIds
			: undefined,
		Search: deferredFilters.search || undefined,
		Sort: deferredFilters.sort,
		Types: deferredFilters.types.length ? deferredFilters.types : undefined,
	};
	const {
		data: albums,
		isError,
		isPending,
	} = useQuery({
		...albumQueries.getAlbums(albumQuery),
		placeholderData: keepPreviousData,
	});
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = languages.map((language) => ({
		label: language.language,
		value: String(language.id),
	}));

	function updateSearch(nextSearch: Partial<AlbumSearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	function setSelectedPartyIds(partyIds: number[]) {
		updateSearch({
			includeTrackCredit: partyIds.length > 0 && filters.includeTrackCredit,
			partyIds,
		});
	}

	const filterControls = (className: string, checkboxId: string) => (
		<div className={className}>
			<InputGroup className="min-w-0 md:w-64">
				<InputGroupAddon>
					<SearchIcon aria-hidden="true" />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search albums"
					placeholder="Search albums..."
					type="search"
					value={filters.search}
					onChange={(event) => {
						updateSearch({ search: event.target.value });
					}}
				/>
			</InputGroup>
			<Field className="min-w-0 md:w-80">
				<div className="flex w-full items-center justify-between gap-3">
					<FieldLabel nativeLabel={false} render={<div />}>
						Party
					</FieldLabel>
					<div className="flex items-center gap-2">
						<Checkbox
							checked={
								filters.partyIds.length > 0 && filters.includeTrackCredit
							}
							disabled={filters.partyIds.length === 0}
							id={checkboxId}
							onCheckedChange={(checked) => {
								updateSearch({ includeTrackCredit: checked === true });
							}}
						/>
						<Label className="text-xs" htmlFor={checkboxId}>
							Include track credit
						</Label>
					</div>
				</div>
				<PartyCombobox
					ariaLabel="Filter by parties"
					placeholder="Filter by parties..."
					selectedIds={filters.partyIds}
					setSelectedIds={setSelectedPartyIds}
				/>
			</Field>
			<div className="min-w-0 md:w-56">
				<EnumFieldSelect
					label="Type"
					multiple
					onValueChange={(types) => updateSearch({ types })}
					options={ALBUM_TYPE_OPTIONS}
					placeholder="All types"
					value={filters.types}
				/>
			</div>
			<div className="min-w-0 md:w-56">
				<EnumFieldSelect
					label="Language"
					multiple
					onValueChange={(languageIds) =>
						updateSearch({ languageIds: languageIds.map(Number) })
					}
					options={languageOptions}
					placeholder="All languages"
					value={filters.languageIds.map(String)}
				/>
			</div>
			<div className="min-w-0 md:ml-auto md:w-56">
				<EnumFieldSelect
					label="Sort"
					onValueChange={(sort) => updateSearch({ sort })}
					options={LIST_SORT_OPTIONS}
					value={filters.sort}
				/>
			</div>
		</div>
	);

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-6 p-4 sm:p-6">
			<header className="flex min-w-0 flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Library</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Albums
					</h1>
				</div>

				<Collapsible defaultOpen={false}>
					<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium sm:hidden">
						Filters
						<ChevronDownIcon aria-hidden="true" className="size-4" />
					</CollapsibleTrigger>
					<CollapsiblePanel className="sm:hidden">
						{filterControls(
							"flex min-w-0 flex-col gap-3 pt-3",
							"include-track-credit-mobile",
						)}
					</CollapsiblePanel>
				</Collapsible>
				{filterControls(
					"hidden min-w-0 flex-col gap-3 sm:flex md:flex-row md:flex-wrap md:items-end",
					"include-track-credit-desktop",
				)}
			</header>

			{isPending ? (
				<AlbumGridSkeleton />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<Disc3Icon aria-hidden="true" />}
					title="Unable to load albums"
				/>
			) : albums.length ? (
				<div className="grid min-w-0 grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
					{albums.map((album) => {
						return (
							<AlbumCard
								album={album}
								className="min-w-0"
								key={album.albumId}
							/>
						);
					})}
				</div>
			) : (
				<LibraryEmptyState
					description="Albums will appear here after they are created."
					icon={<Disc3Icon aria-hidden="true" />}
					title="No albums yet"
				/>
			)}
		</main>
	);
}
function AlbumGridSkeleton() {
	return (
		<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, index) => (
				<Card className="overflow-hidden" key={index}>
					<Skeleton className="aspect-square rounded-none" />
					<CardPanel className="flex flex-col gap-3 p-4">
						<div className="grid gap-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</div>
						<Skeleton className="h-4 w-28" />
					</CardPanel>
				</Card>
			))}
		</div>
	);
}
