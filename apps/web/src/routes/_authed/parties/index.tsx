import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { ChevronDownIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { useDeferredValue } from "react";
import { z } from "zod";

import { Card, CardPanel } from "#/components/coss/card";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/coss/collapsible";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Skeleton } from "#/components/coss/skeleton";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PartyCard } from "#/components/parties/PartyCard";
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

const PARTY_GENDER_FILTER_OPTIONS: {
	label: string;
	value: PartyGenderFilter;
}[] = [{ label: "All", value: "All" }, ...PARTY_GENDER_OPTIONS];

const PARTY_KIND_FILTER_OPTIONS: {
	label: string;
	value: PartyKindFilter;
}[] = [{ label: "All", value: "All" }, ...PARTY_KIND_OPTIONS];

const PARTY_TYPE_FILTER_OPTIONS: {
	label: string;
	value: PartyTypeFilter;
}[] = [{ label: "All", value: "All" }, ...PARTY_TYPE_OPTIONS];

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

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const filters = Route.useSearch();
	const deferredFilters = useDeferredValue(filters);
	const partyQuery: PartyQuery = {
		Gender:
			deferredFilters.gender === "All" ? undefined : deferredFilters.gender,
		Kind: deferredFilters.kind === "All" ? undefined : deferredFilters.kind,
		Search: deferredFilters.search || undefined,
		Sort: deferredFilters.sort,
		Type: deferredFilters.type === "All" ? undefined : deferredFilters.type,
		ExcludeNoAlbums: true,
	};

	const {
		data: parties,
		isError,
		isPending,
	} = useQuery({
		...partyQueries.getParties(partyQuery),
		placeholderData: keepPreviousData,
	});

	function updateSearch(nextSearch: Partial<PartySearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	const filterControls = (className: string) => (
		<div className={className}>
			<InputGroup className="sm:w-64">
				<InputGroupAddon>
					<SearchIcon aria-hidden="true" />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search parties"
					placeholder="Search parties..."
					type="search"
					value={filters.search}
					onChange={(event) => {
						updateSearch({ search: event.target.value });
					}}
				/>
			</InputGroup>
			<div className="sm:w-44">
				<EnumFieldSelect
					label="Type"
					onValueChange={(type) => updateSearch({ type })}
					options={PARTY_TYPE_FILTER_OPTIONS}
					value={filters.type}
				/>
			</div>
			<div className="sm:w-44">
				<EnumFieldSelect
					label="Kind"
					onValueChange={(kind) => updateSearch({ kind })}
					options={PARTY_KIND_FILTER_OPTIONS}
					value={filters.kind}
				/>
			</div>
			<div className="sm:w-44">
				<EnumFieldSelect
					label="Gender"
					onValueChange={(gender) => updateSearch({ gender })}
					options={PARTY_GENDER_FILTER_OPTIONS}
					value={filters.gender}
				/>
			</div>
			<div className="sm:ml-auto sm:w-56">
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
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Library</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Parties
					</h1>
				</div>

				<Collapsible defaultOpen={false}>
					<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium sm:hidden">
						Filters
						<ChevronDownIcon aria-hidden="true" className="size-4" />
					</CollapsibleTrigger>
					<CollapsiblePanel className="sm:hidden">
						{filterControls("flex flex-col gap-3 pt-3")}
					</CollapsiblePanel>
				</Collapsible>
				{filterControls(
					"hidden flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-end",
				)}
			</header>

			{isPending ? (
				<PartyGridSkeleton />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<UsersRoundIcon aria-hidden="true" />}
					title="Unable to load parties"
				/>
			) : parties.length ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{parties.map((party) => {
						return <PartyCard key={party.partyId} party={party} />;
					})}
				</div>
			) : (
				<LibraryEmptyState
					description="Parties will appear here after they are created."
					icon={<UsersRoundIcon aria-hidden="true" />}
					title="No parties yet"
				/>
			)}
		</main>
	);
}

function PartyGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, index) => (
				<Card key={index}>
					<CardPanel className="flex flex-col gap-4 p-4">
						<div className="flex items-start gap-4">
							<Skeleton className="size-16 rounded-2xl" />
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<div className="grid gap-2">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
								</div>
								<div className="flex gap-1.5">
									<Skeleton className="h-5 w-16 rounded-full" />
									<Skeleton className="h-5 w-14 rounded-full" />
								</div>
							</div>
						</div>
						<Skeleton className="mt-auto h-4 w-32" />
					</CardPanel>
				</Card>
			))}
		</div>
	);
}
