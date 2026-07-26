import { useHotkey } from "@tanstack/react-hotkeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { MicVocalIcon, SearchIcon } from "lucide-react";
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
import { NewConcertRow } from "#/components/new/NewMedia";
import {
	NewEmptyState,
	NewFilterPanel,
	NewMediaSkeleton,
	NewPage,
	NewPageHeader,
} from "#/components/new/NewPage";
import { PartyCombobox } from "#/components/PartyCombobox";
import {
	DEFAULT_LIST_SORT,
	isListSortOption,
	LIST_SORT_OPTIONS,
} from "#/enums/listSortEnums";
import type { ListSortOption } from "#/enums/listSortEnums";
import { concertQueries } from "#/lib/queries/concert.queries";
import type { ConcertQuery } from "#/lib/queries/concert.queries";

type ConcertSearch = {
	includeGuestCredit: boolean;
	partyIds: number[];
	search: string;
	sort: ListSortOption;
};
const schema = z
	.object({
		includeGuestCredit: z.boolean().catch(false).default(false),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
		sort: z
			.custom<ListSortOption>(isListSortOption)
			.catch(DEFAULT_LIST_SORT)
			.default(DEFAULT_LIST_SORT),
	})
	.transform(
		(search): ConcertSearch => ({
			...search,
			includeGuestCredit:
				search.partyIds.length > 0 && search.includeGuestCredit,
		}),
	);
const defaults: ConcertSearch = {
	includeGuestCredit: false,
	partyIds: [],
	search: "",
	sort: DEFAULT_LIST_SORT,
};

export const Route = createFileRoute("/new/_authed/concerts/")({
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
	component: RouteComponent,
});

function RouteComponent() {
	const filters = Route.useSearch();
	const deferred = useDeferredValue(filters);
	const navigate = useNavigate({ from: Route.fullPath });
	const searchRef = useRef<HTMLInputElement>(null);
	const query: ConcertQuery = {
		IsIncludeInGuestCredit:
			deferred.partyIds.length && deferred.includeGuestCredit
				? true
				: undefined,
		PartyIds: deferred.partyIds.length ? deferred.partyIds : undefined,
		Search: deferred.search || undefined,
		Sort: deferred.sort,
	};
	const {
		data: concerts = [],
		isError,
		isPending,
		refetch,
	} = useQuery({
		...concertQueries.getConcerts(query),
		placeholderData: keepPreviousData,
	});
	const update = (next: Partial<ConcertSearch>) =>
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...next }),
		});
	useHotkey("Control+F", () => searchRef.current?.focus());
	useHotkey("R", () => update(defaults));

	const controls = (
		<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(16rem,1.4fr)_minmax(10rem,.7fr)] lg:items-end">
			<InputGroup>
				<InputGroupAddon>
					<SearchIcon />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search concerts"
					onChange={(event) => update({ search: event.target.value })}
					placeholder="Search concerts…"
					ref={searchRef}
					type="search"
					value={filters.search}
				/>
			</InputGroup>
			<Field>
				<div className="flex items-center justify-between gap-2">
					<FieldLabel nativeLabel={false} render={<div />}>
						Performer
					</FieldLabel>
					<Label className="flex items-center gap-2 text-xs">
						<Checkbox
							checked={
								filters.partyIds.length > 0 && filters.includeGuestCredit
							}
							disabled={!filters.partyIds.length}
							onCheckedChange={(checked) =>
								update({ includeGuestCredit: checked === true })
							}
						/>
						Guest credits
					</Label>
				</div>
				<PartyCombobox
					ariaLabel="Filter by performers"
					placeholder="All performers"
					selectedIds={filters.partyIds}
					setSelectedIds={(partyIds) =>
						update({
							partyIds,
							includeGuestCredit:
								partyIds.length > 0 && filters.includeGuestCredit,
						})
					}
				/>
			</Field>
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
				description="Live recordings and performances, organized for quick playback."
				eyebrow="Live archive"
				title="Concerts"
			/>
			<NewFilterPanel>{controls}</NewFilterPanel>
			{isPending ? (
				<NewMediaSkeleton kind="row" rows={8} />
			) : isError ? (
				<NewEmptyState
					description="The concert archive could not be loaded."
					icon={<MicVocalIcon />}
					onRetry={() => void refetch()}
					title="Unable to load concerts"
				/>
			) : concerts.length ? (
				<section className="divide-y divide-border/60 border-y border-border/60">
					{concerts.map((concert) => (
						<NewConcertRow concert={concert} key={concert.concertId} />
					))}
				</section>
			) : (
				<NewEmptyState
					description="Try broadening the filters, or add the first live recording."
					icon={<MicVocalIcon />}
					title="No concerts found"
				/>
			)}
		</NewPage>
	);
}
