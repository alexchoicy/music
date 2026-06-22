import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon, UsersRoundIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { PartyCard } from "#/components/parties/PartyCard";
import {
	PARTY_GENDER_OPTIONS,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import { partyQueries } from "#/lib/queries/party.queries";

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

export const Route = createFileRoute("/_authed/parties/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [partyGender, setPartyGender] = useState<PartyGenderFilter>("All");
	const [partyKind, setPartyKind] = useState<PartyKindFilter>("All");
	const [partyType, setPartyType] = useState<PartyTypeFilter>("All");
	const [search, setSearch] = useState("");

	const deferredSearch = useDeferredValue(search);

	const { data: parties = [] } = useQuery({
		...partyQueries.getParties({
			Search: deferredSearch,
			Type: partyType === "All" ? undefined : partyType,
			Kind: partyKind === "All" ? undefined : partyKind,
			Gender: partyGender === "All" ? undefined : partyGender,
		}),
		placeholderData: keepPreviousData,
	});

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Library</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Parties
					</h1>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
					<InputGroup className="sm:max-w-sm">
						<InputGroupAddon>
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Search parties"
							placeholder="Search parties..."
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</InputGroup>
					<div className="sm:w-44">
						<EnumFieldSelect
							label="Type"
							onValueChange={setPartyType}
							options={PARTY_TYPE_FILTER_OPTIONS}
							value={partyType}
						/>
					</div>
					<div className="sm:w-44">
						<EnumFieldSelect
							label="Kind"
							onValueChange={setPartyKind}
							options={PARTY_KIND_FILTER_OPTIONS}
							value={partyKind}
						/>
					</div>
					<div className="sm:w-44">
						<EnumFieldSelect
							label="Gender"
							onValueChange={setPartyGender}
							options={PARTY_GENDER_FILTER_OPTIONS}
							value={partyGender}
						/>
					</div>
				</div>
			</header>

			{parties.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{parties.map((party) => {
						return <PartyCard key={party.partyId} party={party} />;
					})}
				</div>
			) : (
				<Empty className="min-h-80 rounded-2xl border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<UsersRoundIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No parties yet</EmptyTitle>
						<EmptyDescription>
							Parties will appear here after they are created.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</main>
	);
}
