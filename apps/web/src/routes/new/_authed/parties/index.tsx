import { useHotkey } from "@tanstack/react-hotkeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { SearchIcon, UsersRoundIcon } from "lucide-react";
import { useDeferredValue, useRef } from "react";
import { z } from "zod";

import { Checkbox } from "#/components/coss/checkbox";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Label } from "#/components/coss/label";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { NewPartyRow } from "#/components/new/NewMedia";
import {
	NewEmptyState,
	NewFilterPanel,
	NewMediaSkeleton,
	NewPage,
	NewPageHeader,
} from "#/components/new/NewPage";
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

type Gender = "All" | (typeof PARTY_GENDER_OPTIONS)[number]["value"];
type Kind = "All" | (typeof PARTY_KIND_OPTIONS)[number]["value"];
type Type = "All" | (typeof PARTY_TYPE_OPTIONS)[number]["value"];
type PartySearch = {
	excludeNoAlbums: boolean;
	gender: Gender;
	kind: Kind;
	search: string;
	sort: ListSortOption;
	type: Type;
};
const genderValues = new Set<string>(
	PARTY_GENDER_OPTIONS.map((item) => item.value),
);
const kindValues = new Set<string>(
	PARTY_KIND_OPTIONS.map((item) => item.value),
);
const typeValues = new Set<string>(
	PARTY_TYPE_OPTIONS.map((item) => item.value),
);
const filter = <T extends string>(values: Set<string>) =>
	z
		.custom<"All" | T>(
			(value) =>
				value === "All" || (typeof value === "string" && values.has(value)),
		)
		.catch("All")
		.default("All");
const schema = z.object({
	excludeNoAlbums: z.boolean().catch(true).default(true),
	gender: filter<Exclude<Gender, "All">>(genderValues),
	kind: filter<Exclude<Kind, "All">>(kindValues),
	search: z.string().catch("").default(""),
	sort: z
		.custom<ListSortOption>(isListSortOption)
		.catch(DEFAULT_LIST_SORT)
		.default(DEFAULT_LIST_SORT),
	type: filter<Exclude<Type, "All">>(typeValues),
});
const defaults: PartySearch = {
	excludeNoAlbums: true,
	gender: "All",
	kind: "All",
	search: "",
	sort: DEFAULT_LIST_SORT,
	type: "All",
};
const withAll = <T extends { label: string; value: string }>(
	options: readonly T[],
) => [{ label: "All", value: "All" }, ...options];

export const Route = createFileRoute("/new/_authed/parties/")({
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
	component: RouteComponent,
});

function RouteComponent() {
	const filters = Route.useSearch();
	const deferred = useDeferredValue(filters);
	const navigate = useNavigate({ from: Route.fullPath });
	const searchRef = useRef<HTMLInputElement>(null);
	const query: PartyQuery = {
		ExcludeNoAlbums: deferred.excludeNoAlbums,
		Gender: deferred.gender === "All" ? undefined : deferred.gender,
		Kind: deferred.kind === "All" ? undefined : deferred.kind,
		Search: deferred.search || undefined,
		Sort: deferred.sort,
		Type: deferred.type === "All" ? undefined : deferred.type,
	};
	const {
		data: parties = [],
		isError,
		isPending,
		refetch,
	} = useQuery({
		...partyQueries.getParties(query),
		placeholderData: keepPreviousData,
	});
	const update = (next: Partial<PartySearch>) =>
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...next }),
		});
	useHotkey("Control+F", () => searchRef.current?.focus());
	useHotkey("R", () => update(defaults));

	const controls = (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,.65fr))_minmax(10rem,.8fr)] lg:items-end">
			<InputGroup>
				<InputGroupAddon>
					<SearchIcon />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search artists"
					onChange={(event) => update({ search: event.target.value })}
					placeholder="Search artists…"
					ref={searchRef}
					type="search"
					value={filters.search}
				/>
			</InputGroup>
			<EnumFieldSelect
				label="Type"
				onValueChange={(type) => update({ type: type as Type })}
				options={withAll(PARTY_TYPE_OPTIONS)}
				value={filters.type}
			/>
			<EnumFieldSelect
				label="Kind"
				onValueChange={(kind) => update({ kind: kind as Kind })}
				options={withAll(PARTY_KIND_OPTIONS)}
				value={filters.kind}
			/>
			<EnumFieldSelect
				label="Gender"
				onValueChange={(gender) => update({ gender: gender as Gender })}
				options={withAll(PARTY_GENDER_OPTIONS)}
				value={filters.gender}
			/>
			<EnumFieldSelect
				label="Sort"
				onValueChange={(sort) => update({ sort })}
				options={LIST_SORT_OPTIONS}
				value={filters.sort}
			/>
			<Label className="flex min-h-9 items-center gap-2 text-xs sm:col-span-2 lg:col-span-5">
				<Checkbox
					checked={filters.excludeNoAlbums}
					onCheckedChange={(checked) =>
						update({ excludeNoAlbums: checked === true })
					}
				/>
				Only artists with albums
			</Label>
		</div>
	);

	return (
		<NewPage>
			<NewPageHeader
				description="Artists, groups, composers, and contributors across your collection."
				eyebrow="People & groups"
				title="Artists"
			/>
			<NewFilterPanel>{controls}</NewFilterPanel>
			{isPending ? (
				<NewMediaSkeleton kind="row" rows={10} />
			) : isError ? (
				<NewEmptyState
					description="The artist directory could not be loaded."
					icon={<UsersRoundIcon />}
					onRetry={() => void refetch()}
					title="Unable to load artists"
				/>
			) : parties.length ? (
				<section className="grid gap-x-8 divide-y divide-border/60 border-y border-border/60 xl:grid-cols-2 xl:[&>*:nth-child(2)]:border-t-0">
					{parties.map((party) => (
						<NewPartyRow key={party.partyId} party={party} />
					))}
				</section>
			) : (
				<NewEmptyState
					description="Try broadening the filters, or create the first artist profile."
					icon={<UsersRoundIcon />}
					title="No artists found"
				/>
			)}
		</NewPage>
	);
}
