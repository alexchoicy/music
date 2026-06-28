import { useHotkey } from "@tanstack/react-hotkeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { ChevronDownIcon, MicVocalIcon, SearchIcon } from "lucide-react";
import { useDeferredValue, useRef } from "react";
import { z } from "zod";

import { ConcertCard } from "#/components/concerts/ConcertCard";
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
	sort: DEFAULT_LIST_SORT,
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
	const concertGridRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
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
		Sort: deferredFilters.sort,
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

	function focusConcertCard(direction: "down" | "left" | "right" | "up") {
		const grid = concertGridRef.current;
		if (!grid) return;

		const links = Array.from(grid.querySelectorAll<HTMLAnchorElement>("a"));
		if (!links.length) return;

		const firstRowTop = links[0]?.offsetTop;
		const nextRowIndex = links.findIndex(
			(link) => link.offsetTop !== firstRowTop,
		);
		const columnCount = nextRowIndex === -1 ? links.length : nextRowIndex;
		const currentIndex = links.findIndex(
			(link) => link === document.activeElement,
		);
		const nextIndex = {
			down: currentIndex === -1 ? 0 : currentIndex + columnCount,
			left: currentIndex === -1 ? 0 : currentIndex - 1,
			right: currentIndex === -1 ? 0 : currentIndex + 1,
			up: currentIndex === -1 ? 0 : currentIndex - columnCount,
		}[direction];

		links.at(Math.max(0, Math.min(links.length - 1, nextIndex)))?.focus();
	}

	useHotkey("Escape", () => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	});
	useHotkey("W", () => focusConcertCard("up"));
	useHotkey("A", () => focusConcertCard("left"));
	useHotkey("S", () => focusConcertCard("down"));
	useHotkey("D", () => focusConcertCard("right"));
	useHotkey("Control+F", () => searchInputRef.current?.focus());
	useHotkey("R", () => updateSearch(concertSearchDefaults));
	useHotkey("T", () => {
		const currentIndex = LIST_SORT_OPTIONS.findIndex(
			(option) => option.value === filters.sort,
		);
		updateSearch({
			sort: LIST_SORT_OPTIONS[(currentIndex + 1) % LIST_SORT_OPTIONS.length]
				.value,
		});
	});
	useHotkey("E", () => {
		const links =
			concertGridRef.current?.querySelectorAll<HTMLAnchorElement>("a");
		links?.[links.length - 1]?.focus();
	});
	useHotkey("Shift+E", () => {
		concertGridRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
	});

	const filterControls = (className: string, checkboxId: string) => (
		<div className={className}>
			<InputGroup className="min-w-0 sm:w-64">
				<InputGroupAddon>
					<SearchIcon aria-hidden="true" />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search concerts"
					placeholder="Search concerts..."
					ref={searchInputRef}
					type="search"
					value={filters.search}
					onChange={(event) => {
						updateSearch({ search: event.target.value });
					}}
				/>
			</InputGroup>
			<Field className="min-w-0 sm:w-80">
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
							id={checkboxId}
							onCheckedChange={(checked) => {
								updateSearch({ includeGuestCredit: checked === true });
							}}
						/>
						<Label className="text-xs" htmlFor={checkboxId}>
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
			<div className="min-w-0 sm:ml-auto sm:w-56">
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
						Concerts
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
							"include-guest-credit-mobile",
						)}
					</CollapsiblePanel>
				</Collapsible>
				{filterControls(
					"hidden min-w-0 flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-end",
					"include-guest-credit-desktop",
				)}
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
				<div
					className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
					ref={concertGridRef}
				>
					{concerts.map((concert) => {
						return (
							<ConcertCard
								className="min-w-0"
								concert={concert}
								key={concert.concertId}
							/>
						);
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
		<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
