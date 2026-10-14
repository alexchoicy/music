import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { MicVocalIcon } from "lucide-react";
import { useRef } from "react";
import { z } from "zod";

import { PageHeader } from "#/components/app/PageHeader";
import { ConcertTile } from "#/components/concert/ConcertTile";
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
import { PartyFilterField } from "#/components/party/PartyFilterCombobox";
import {
	DEFAULT_LIST_SORT,
	isListSortOption,
	LIST_SORT_OPTIONS,
} from "#/enums/listSortEnums";
import type { ListSortOption } from "#/enums/listSortEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { concertQueries } from "#/lib/queries/concert.queries";
import type { ConcertQuery } from "#/lib/queries/concert.queries";

type ConcertSearch = {
	includeGuestCredit: boolean;
	partyIds: number[];
	search: string;
	sort: ListSortOption;
};

const concertSearchSchema = z
	.object({
		includeGuestCredit: z.boolean().catch(false).default(false),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
		sort: z
			.custom<ListSortOption>(isListSortOption)
			.catch(DEFAULT_LIST_SORT)
			.default(DEFAULT_LIST_SORT),
	})
	.transform((search): ConcertSearch => ({
		...search,
		includeGuestCredit: search.partyIds.length > 0 && search.includeGuestCredit,
	}));

const concertSearchDefaults: ConcertSearch = {
	includeGuestCredit: false,
	partyIds: [],
	search: "",
	sort: DEFAULT_LIST_SORT,
};

export const Route = createFileRoute("/_authed/concerts/")({
	validateSearch: concertSearchSchema,
	search: {
		middlewares: [stripSearchParams(concertSearchDefaults)],
	},
	component: RouteComponent,
});

const CONCERT_GRID_CLASS =
	"grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-4 gap-y-7";

function isDefaultSearch(search: ConcertSearch) {
	return (
		!search.search &&
		search.partyIds.length === 0 &&
		search.sort === DEFAULT_LIST_SORT
	);
}

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const concertGridRef = useRef<HTMLUListElement>(null);
	useGridFocusHotkeys(concertGridRef);
	const filters = Route.useSearch();
	const debouncedSearch = useDebouncedValue(filters.search, 250);
	const concertQuery: ConcertQuery = {
		IsIncludeInGuestCredit:
			filters.partyIds.length && filters.includeGuestCredit ? true : undefined,
		PartyIds: filters.partyIds.length ? filters.partyIds : undefined,
		Search: debouncedSearch || undefined,
		Sort: filters.sort,
	};
	const {
		data: concerts,
		isError,
		isPending,
	} = useQuery({
		...concertQueries.getConcerts(concertQuery),
		placeholderData: keepPreviousData,
	});

	function updateSearch(nextSearch: Partial<ConcertSearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-6 p-4 sm:p-6">
			<PageHeader title="Concerts" />

			<div
				aria-label="Filter concerts"
				className="flex flex-wrap items-end gap-3"
				role="search"
			>
				<SearchField
					label="Search concerts"
					onValueChange={(search) => updateSearch({ search })}
					value={filters.search}
				/>
				<PartyFilterField
					creditLabel="Include guest credit"
					includeCredit={filters.includeGuestCredit}
					label="Party"
					onIncludeCreditChange={(includeGuestCredit) =>
						updateSearch({ includeGuestCredit })
					}
					onSelectedIdsChange={(partyIds) =>
						updateSearch({
							includeGuestCredit:
								partyIds.length > 0 && filters.includeGuestCredit,
							partyIds,
						})
					}
					selectedIds={filters.partyIds}
				/>
				<FilterSelect
					className="sm:ms-auto sm:w-56"
					label="Sort"
					onValueChange={(sort) => updateSearch({ sort })}
					options={LIST_SORT_OPTIONS}
					value={filters.sort}
				/>
				<ResetFiltersButton
					disabled={isDefaultSearch(filters)}
					onClick={() => updateSearch(concertSearchDefaults)}
				/>
			</div>

			{isPending ? (
				<TileGridSkeleton gridClassName={CONCERT_GRID_CLASS} shape="wide" />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<MicVocalIcon aria-hidden="true" />}
					title="Unable to load concerts"
				/>
			) : concerts.length === 0 ? (
				<LibraryEmptyState
					description={
						isDefaultSearch(filters)
							? "Concerts will appear here after they are created."
							: "No concerts match these filters."
					}
					icon={<MicVocalIcon aria-hidden="true" />}
					title={isDefaultSearch(filters) ? "No concerts yet" : "No matches"}
				/>
			) : (
				<>
					<ul
						aria-label="Concerts"
						ref={concertGridRef}
						className={CONCERT_GRID_CLASS}
					>
						{concerts.map((concert) => (
							<li className="min-w-0" key={concert.concertId}>
								<ConcertTile concert={concert} />
							</li>
						))}
					</ul>
					<LibraryFooter>
						<p className="text-xs text-muted-foreground">
							{concerts.length} {concerts.length === 1 ? "concert" : "concerts"}
						</p>
					</LibraryFooter>
				</>
			)}
		</main>
	);
}
