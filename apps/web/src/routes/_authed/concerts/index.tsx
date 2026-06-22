import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { MicVocalIcon, SearchIcon } from "lucide-react";
import { useDeferredValue } from "react";
import { z } from "zod";

import { ConcertCard } from "#/components/concerts/ConcertCard";
import { Card, CardPanel } from "#/components/coss/card";
import { Checkbox } from "#/components/coss/checkbox";
import { Field, FieldLabel } from "#/components/coss/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Label } from "#/components/coss/label";
import { Skeleton } from "#/components/coss/skeleton";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PartyCombobox } from "#/components/PartyCombobox";
import { concertQueries } from "#/lib/queries/concert.queries";
import type { ConcertQuery } from "#/lib/queries/concert.queries";

type ConcertSearch = {
	includeGuestCredit: boolean;
	partyIds: number[];
	search: string;
};

const concertSearchSchema = z
	.object({
		includeGuestCredit: z.boolean().catch(false).default(false),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
	})
	.transform(
		(search): ConcertSearch => ({
			...search,
			includeGuestCredit:
				search.partyIds.length > 0 && search.includeGuestCredit,
		}),
	);

const concertSearchDefaults: ConcertSearch = {
	includeGuestCredit: false,
	partyIds: [],
	search: "",
};

export const Route = createFileRoute("/_authed/concerts/")({
	validateSearch: concertSearchSchema,
	search: {
		middlewares: [stripSearchParams(concertSearchDefaults)],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const filters = Route.useSearch();
	const deferredFilters = useDeferredValue(filters);
	const concertQuery: ConcertQuery = {
		IsIncludeInGuestCredit:
			deferredFilters.partyIds.length && deferredFilters.includeGuestCredit
				? true
				: undefined,
		PartyIds: deferredFilters.partyIds.length
			? deferredFilters.partyIds
			: undefined,
		Search: deferredFilters.search || undefined,
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

	function setSelectedPartyIds(partyIds: number[]) {
		updateSearch({
			includeGuestCredit: partyIds.length > 0 && filters.includeGuestCredit,
			partyIds,
		});
	}

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Library</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Concerts
					</h1>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
					<InputGroup className="sm:max-w-sm">
						<InputGroupAddon>
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Search concerts"
							placeholder="Search concerts..."
							type="search"
							value={filters.search}
							onChange={(event) => {
								updateSearch({ search: event.target.value });
							}}
						/>
					</InputGroup>
					<Field className="sm:w-80">
						<div className="flex w-full items-center justify-between gap-3">
							<FieldLabel nativeLabel={false} render={<div />}>
								Party
							</FieldLabel>
							<div className="flex items-center gap-2">
								<Checkbox
									checked={
										filters.partyIds.length > 0 && filters.includeGuestCredit
									}
									disabled={filters.partyIds.length === 0}
									id="include-guest-credit"
									onCheckedChange={(checked) => {
										updateSearch({ includeGuestCredit: checked === true });
									}}
								/>
								<Label className="text-xs" htmlFor="include-guest-credit">
									Include guest credit
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
				</div>
			</header>

			{isPending ? (
				<ConcertGridSkeleton />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<MicVocalIcon aria-hidden="true" />}
					title="Unable to load concerts"
				/>
			) : concerts.length ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{concerts.map((concert) => {
						return <ConcertCard concert={concert} key={concert.concertId} />;
					})}
				</div>
			) : (
				<LibraryEmptyState
					description="Concerts will appear here after they are created."
					icon={<MicVocalIcon aria-hidden="true" />}
					title="No concerts yet"
				/>
			)}
		</main>
	);
}
function ConcertGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, index) => (
				<Card className="overflow-hidden" key={index}>
					<Skeleton className="aspect-video rounded-none" />
					<CardPanel className="flex flex-col gap-3 p-4">
						<div className="grid gap-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-2/3" />
						</div>
						<Skeleton className="h-4 w-40" />
					</CardPanel>
				</Card>
			))}
		</div>
	);
}
