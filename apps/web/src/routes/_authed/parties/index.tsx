import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { UsersRoundIcon } from "lucide-react";
import { useDeferredValue, useId, useRef } from "react";
import { z } from "zod";

import { PageHeader } from "#/components/app/PageHeader";
import { Label } from "#/components/base/label";
import { Switch } from "#/components/base/switch";
import { FilterChips } from "#/components/library/FilterChips";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	LibraryEmptyState,
	TileGridSkeleton,
} from "#/components/library/LibraryStates";
import {
	LibraryFooter,
	ResetFiltersButton,
	SearchField,
} from "#/components/library/LibraryToolbar";
import { useGridFocusHotkeys } from "#/components/library/useGridFocusHotkeys";
import { PartyTile } from "#/components/party/PartyTile";
import { usePlayParty } from "#/components/party/usePlayParty";
import {
	DEFAULT_LIST_SORT,
	isListSortOption,
	LIST_SORT_OPTIONS,
} from "#/enums/listSortEnums";
import type { ListSortOption } from "#/enums/listSortEnums";
import {
	PARTY_GENDER_OPTIONS,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import { partyQueries } from "#/lib/queries/party.queries";
import type { PartyQuery } from "#/lib/queries/party.queries";

type PartyGenderFilter = "All" | (typeof PARTY_GENDER_OPTIONS)[number]["value"];
type PartyKindFilter = "All" | (typeof PARTY_KIND_OPTIONS)[number]["value"];
type PartyTypeFilter = "All" | (typeof PARTY_TYPE_OPTIONS)[number]["value"];

type PartySearch = {
	gender: PartyGenderFilter;
	kind: PartyKindFilter;
	search: string;
	sort: ListSortOption;
	type: PartyTypeFilter;
	excludeNoAlbums: boolean;
};

const PARTY_GENDER_VALUES: ReadonlySet<string> = new Set(
	PARTY_GENDER_OPTIONS.map((option) => option.value),
);
const PARTY_KIND_VALUES: ReadonlySet<string> = new Set(
	PARTY_KIND_OPTIONS.map((option) => option.value),
);
const PARTY_TYPE_VALUES: ReadonlySet<string> = new Set(
	PARTY_TYPE_OPTIONS.map((option) => option.value),
);

function filterSchema<Value extends string>(values: ReadonlySet<string>) {
	return z
		.custom<"All" | Value>(
			(value) =>
				value === "All" || (typeof value === "string" && values.has(value)),
		)
		.catch("All")
		.default("All");
}

const partySearchSchema = z.object({
	gender: filterSchema<Exclude<PartyGenderFilter, "All">>(PARTY_GENDER_VALUES),
	kind: filterSchema<Exclude<PartyKindFilter, "All">>(PARTY_KIND_VALUES),
	search: z.string().catch("").default(""),
	excludeNoAlbums: z.boolean().catch(true).default(true),
	sort: z
		.custom<ListSortOption>(isListSortOption)
		.catch(DEFAULT_LIST_SORT)
		.default(DEFAULT_LIST_SORT),
	type: filterSchema<Exclude<PartyTypeFilter, "All">>(PARTY_TYPE_VALUES),
});

const partySearchDefaults: PartySearch = {
	gender: "All",
	kind: "All",
	search: "",
	sort: DEFAULT_LIST_SORT,
	type: "All",
	excludeNoAlbums: true,
};

export const Route = createFileRoute("/_authed/parties/")({
	validateSearch: partySearchSchema,
	search: {
		middlewares: [stripSearchParams(partySearchDefaults)],
	},
	component: RouteComponent,
});

const PARTY_GRID_CLASS =
	"grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(148px,1fr))]";

// Chip groups use [] for "All"; the URL keeps the "All" sentinel.
function toChips<Value extends string>(value: "All" | Value): Value[] {
	return value === "All" ? [] : [value];
}

function fromChips<Value extends string>(value: Value[]): "All" | Value {
	return value[0] ?? "All";
}

function isDefaultSearch(search: PartySearch) {
	return (
		!search.search &&
		search.gender === "All" &&
		search.kind === "All" &&
		search.type === "All" &&
		search.excludeNoAlbums &&
		search.sort === DEFAULT_LIST_SORT
	);
}

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const partyGridRef = useRef<HTMLUListElement>(null);
	const playParty = usePlayParty();
	const excludeNoAlbumsId = useId();
	const filters = Route.useSearch();
	const deferredFilters = useDeferredValue(filters);
	const partyQuery: PartyQuery = {
		Gender:
			deferredFilters.gender === "All" ? undefined : deferredFilters.gender,
		Kind: deferredFilters.kind === "All" ? undefined : deferredFilters.kind,
		Search: deferredFilters.search || undefined,
		Sort: deferredFilters.sort,
		Type: deferredFilters.type === "All" ? undefined : deferredFilters.type,
		ExcludeNoAlbums: deferredFilters.excludeNoAlbums,
	};
	const {
		data: parties,
		isError,
		isPending,
	} = useQuery({
		...partyQueries.getParties(partyQuery),
		placeholderData: keepPreviousData,
	});

	function playFocusedParty(
		index: number,
		options?: { queue?: boolean; next?: boolean },
	) {
		const party = parties?.[index];
		if (party) void playParty(party, options);
	}
	useGridFocusHotkeys(partyGridRef, {
		onPlay: (index) => playFocusedParty(index),
		onPlayNext: (index) => playFocusedParty(index, { next: true }),
		onQueue: (index) => playFocusedParty(index, { queue: true }),
	});

	function updateSearch(nextSearch: Partial<PartySearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-6 p-4 sm:p-6">
			<PageHeader title="Parties" />

			<div
				aria-label="Filter parties"
				className="flex flex-col gap-4"
				role="search"
			>
				<div className="flex flex-wrap items-end gap-x-5 gap-y-3">
					<SearchField
						label="Search parties"
						onValueChange={(search) => updateSearch({ search })}
						value={filters.search}
					/>
					<span className="flex h-8 items-center gap-2.5">
						<Switch
							checked={filters.excludeNoAlbums}
							id={excludeNoAlbumsId}
							onCheckedChange={(checked) =>
								updateSearch({ excludeNoAlbums: checked })
							}
						/>
						<Label htmlFor={excludeNoAlbumsId}>
							Hide parties without albums
						</Label>
					</span>
					<FilterSelect
						className="sm:ms-auto sm:w-56"
						label="Sort"
						onValueChange={(sort) => updateSearch({ sort })}
						options={LIST_SORT_OPTIONS}
						value={filters.sort}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-x-7 gap-y-3">
					<FilterChips
						label="Type"
						onValueChange={(type) => updateSearch({ type: fromChips(type) })}
						options={PARTY_TYPE_OPTIONS}
						value={toChips(filters.type)}
					/>
					<FilterChips
						label="Kind"
						onValueChange={(kind) => updateSearch({ kind: fromChips(kind) })}
						options={PARTY_KIND_OPTIONS}
						value={toChips(filters.kind)}
					/>
					<FilterChips
						label="Gender"
						onValueChange={(gender) =>
							updateSearch({ gender: fromChips(gender) })
						}
						options={PARTY_GENDER_OPTIONS}
						value={toChips(filters.gender)}
					/>
					<div className="ms-auto">
						<ResetFiltersButton
							disabled={isDefaultSearch(filters)}
							onClick={() => updateSearch(partySearchDefaults)}
						/>
					</div>
				</div>
			</div>

			{isPending ? (
				<TileGridSkeleton gridClassName={PARTY_GRID_CLASS} shape="round" />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<UsersRoundIcon aria-hidden="true" />}
					title="Unable to load parties"
				/>
			) : parties.length === 0 ? (
				<LibraryEmptyState
					description={
						isDefaultSearch(filters)
							? "Parties will appear here after they are created."
							: "No parties match these filters."
					}
					icon={<UsersRoundIcon aria-hidden="true" />}
					title={isDefaultSearch(filters) ? "No parties yet" : "No matches"}
				/>
			) : (
				<>
					<ul
						aria-label="Parties"
						ref={partyGridRef}
						className={PARTY_GRID_CLASS}
					>
						{parties.map((party) => (
							<li className="min-w-0" key={party.partyId}>
								<PartyTile party={party} variant="library" />
							</li>
						))}
					</ul>
					<LibraryFooter>
						<p className="text-xs text-muted-foreground">
							{parties.length} {parties.length === 1 ? "party" : "parties"}
						</p>
					</LibraryFooter>
				</>
			)}
		</main>
	);
}
