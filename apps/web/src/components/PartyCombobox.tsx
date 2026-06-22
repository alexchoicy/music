import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	useQueries,
} from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "#/components/coss/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxStatus,
	ComboboxValue,
} from "#/components/coss/combobox";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import { Field, FieldLabel } from "#/components/coss/field";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import type { components } from "#/data/APIschema";
import {
	COUNTRY_CODE,
	COUNTRY_CODE_OPTIONS,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import { partyMutation, partyQueries } from "#/lib/queries/party.queries";
import { searchPartyByNormalizedName } from "#/lib/utils/party";
import { normalizeString } from "#/lib/utils/string";
import type { PartyItem } from "#/store/albumUploadStoreType";

type CreatePartyRequest = components["schemas"]["CreatePartyRequest"];
type PartyDetails = components["schemas"]["PartyDetails"];

export type PartyComboboxId = number;

type PartyComboboxItem = PartyItem & {
	creatableName?: string;
};

type PartyComboboxProps = {
	allowCreate?: boolean;
	ariaLabel?: string;
	filterOutIds?: PartyComboboxId[];
	placeholder?: string;
	selectedIds: PartyComboboxId[];
	setSelectedIds: (selectedIds: PartyComboboxId[]) => void;
};

type CreatePartyForm = Pick<
	CreatePartyRequest,
	"country" | "kind" | "name" | "type"
>;

const EMPTY_FILTER_OUT_IDS: PartyComboboxId[] = [];
const SEARCH_DEBOUNCE_MS = 300;

function createPartyForm(name: string): CreatePartyForm {
	return {
		country: "XX",
		kind: "Human",
		name,
		type: "Individual",
	};
}

function partyDetailsToItem(party: PartyDetails): PartyItem {
	return {
		aliases: party.aliases,
		albumCount: party.albums.length + party.appearsOnAlbums.length,
		country: party.country,
		coverUrl: party.avatarImages?.[0]?.url ?? "",
		kind: party.kind,
		name: party.name,
		normalizedName: normalizeString(party.name),
		partyId: party.partyId,
		type: party.type,
	};
}

export function PartyCombobox({
	allowCreate = false,
	ariaLabel = "Parties",
	filterOutIds = EMPTY_FILTER_OUT_IDS,
	placeholder,
	selectedIds,
	setSelectedIds,
}: PartyComboboxProps): React.ReactElement {
	const nameId = useId();
	const queryClient = useQueryClient();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<CreatePartyForm>(() =>
		createPartyForm(""),
	);
	const placeholderText =
		placeholder ??
		(allowCreate ? "Search or create parties..." : "Search parties...");
	const highlightedItemRef = useRef<PartyComboboxItem | undefined>(undefined);

	const { isPending, mutateAsync: createParty } = useMutation(
		partyMutation.createParty(),
	);

	const trimmedQuery = query.trim();
	const trimmedSearchQuery = debouncedQuery.trim();
	const normalizedTrimmedQuery = normalizeString(trimmedQuery);
	const cachedParties =
		queryClient.getQueryData<PartyItem[]>(["parties", undefined]) ?? [];
	const {
		data: searchParties = [],
		isFetching: isSearching,
		isError: isSearchError,
	} = useQuery({
		...partyQueries.getParties(
			trimmedSearchQuery ? { Search: trimmedSearchQuery } : undefined,
		),
		placeholderData: keepPreviousData,
	});
	const isSearchPending = trimmedQuery !== trimmedSearchQuery || isSearching;
	const fetchedSelectedIdKeys = new Set(
		[...cachedParties, ...searchParties].map((party) => Number(party.partyId)),
	);
	const selectedPartyQueries = useQueries({
		queries: selectedIds
			.filter((partyId) => !fetchedSelectedIdKeys.has(partyId))
			.map((partyId) => partyQueries.getParty(partyId)),
	});
	const selectedDetailsParties = selectedPartyQueries
		.map((result) => result.data)
		.filter((party): party is PartyDetails => party !== undefined)
		.map(partyDetailsToItem);
	const parties = [
		...cachedParties,
		...searchParties,
		...selectedDetailsParties,
	];
	const selectedIdKeys = new Set(selectedIds);
	const hiddenIdKeys = new Set([...selectedIds, ...filterOutIds]);
	const uniqueParties = Array.from(
		new Map(parties.map((party) => [Number(party.partyId), party])).values(),
	);
	const selectedParties: PartyComboboxItem[] = uniqueParties.filter((party) =>
		selectedIdKeys.has(Number(party.partyId)),
	);
	const filteredParties = searchParties.filter(
		(party) => !hiddenIdKeys.has(Number(party.partyId)),
	);
	useEffect(() => {
		if (filteredParties.length > 0) {
			setDebouncedQuery(query);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDebouncedQuery(query);
		}, SEARCH_DEBOUNCE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [filteredParties.length, query]);
	const showSearchingStatus = isSearchPending && filteredParties.length === 0;
	const existingPartyForQuery = searchPartyByNormalizedName(
		uniqueParties,
		normalizedTrimmedQuery,
	);
	const canCreate =
		allowCreate &&
		trimmedQuery !== "" &&
		!isSearchPending &&
		existingPartyForQuery === undefined;
	const items: PartyComboboxItem[] = canCreate
		? [
				...filteredParties,
				{
					aliases: [],
					country: "XX",
					coverUrl: "",
					creatableName: trimmedQuery,
					kind: "Human",
					name: `Create "${trimmedQuery}"`,
					normalizedName: normalizedTrimmedQuery,
					partyId: 0,
					type: "Individual",
					albumCount: 0,
				},
			]
		: filteredParties;

	function openCreateDialog(name: string) {
		if (!allowCreate) return;

		setCreateForm(createPartyForm(name));
		setIsCreateDialogOpen(true);
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Enter" || highlightedItemRef.current || !canCreate)
			return;

		event.preventDefault();
		openCreateDialog(trimmedQuery);
	}

	async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();

		const name = createForm.name.trim();
		if (!name) return;

		const existing = searchPartyByNormalizedName(
			uniqueParties,
			normalizeString(name),
		);

		if (existing) {
			setSelectedIds([...selectedIds, Number(existing.partyId)]);
			setQuery("");
			setIsCreateDialogOpen(false);
			return;
		}

		const result = await createParty({
			...createForm,
			avatar: null,
			banner: null,
			musicBrainzID: null,
			name,
		});

		await queryClient.refetchQueries({ queryKey: ["parties"] });
		setSelectedIds([...selectedIds, Number(result.partyId)]);
		setQuery("");
		setIsCreateDialogOpen(false);
	}

	return (
		<>
			<Combobox<PartyComboboxItem, true>
				filter={null}
				inputValue={query}
				items={items}
				multiple
				onInputValueChange={setQuery}
				onItemHighlighted={(item) => {
					highlightedItemRef.current = item;
				}}
				onValueChange={(nextValue) => {
					const creatableItem = nextValue.find((item) => item.creatableName);

					if (creatableItem?.creatableName) {
						openCreateDialog(creatableItem.creatableName);
						return;
					}

					setSelectedIds(nextValue.map((party) => Number(party.partyId)));
					setQuery("");
				}}
				value={selectedParties}
			>
				<ComboboxChips aria-label={ariaLabel}>
					<ComboboxValue>
						{(value: PartyComboboxItem[]) => (
							<>
								{value.map((party) => (
									<ComboboxChip
										key={party.partyId}
										removeProps={{ "aria-label": `Remove ${party.name}` }}
									>
										{party.name}
									</ComboboxChip>
								))}
								<ComboboxChipsInput
									aria-label={ariaLabel}
									onKeyDown={handleInputKeyDown}
									placeholder={value.length > 0 ? "" : placeholderText}
								/>
							</>
						)}
					</ComboboxValue>
				</ComboboxChips>
				<ComboboxPopup>
					<ComboboxStatus>
						{showSearchingStatus
							? "Searching..."
							: isSearchError
								? "Unable to search parties."
								: null}
					</ComboboxStatus>
					<ComboboxEmpty>No parties found.</ComboboxEmpty>
					<ComboboxList>
						{(item: PartyComboboxItem) =>
							item.creatableName ? (
								<ComboboxItem
									key={`create:${item.normalizedName}`}
									value={item}
								>
									<span className="flex items-center gap-2">
										<PlusIcon aria-hidden="true" />
										Create "{item.creatableName}"
									</span>
								</ComboboxItem>
							) : (
								<ComboboxItem key={item.partyId} value={item}>
									<span className="flex min-w-0 flex-col">
										<span className="truncate">{item.name}</span>
										<span className="truncate text-xs text-muted-foreground">
											{COUNTRY_CODE[item.country]} · {item.kind} ·{" "}
											{item.type ?? "Unknown"}
										</span>
									</span>
								</ComboboxItem>
							)
						}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>

			{allowCreate && (
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Create party</DialogTitle>
							<DialogDescription>Add a party and select it.</DialogDescription>
						</DialogHeader>
						<Form className="contents" onSubmit={handleCreateSubmit}>
							<DialogPanel className="grid gap-4">
								<Field name="name">
									<FieldLabel htmlFor={nameId}>Party name</FieldLabel>
									<Input
										autoComplete="off"
										id={nameId}
										name="name"
										onChange={(event) => {
											setCreateForm((current) => ({
												...current,
												name: event.target.value,
											}));
										}}
										required
										value={createForm.name}
									/>
								</Field>
								<EnumFieldSelect
									label="Type"
									onValueChange={(type) => {
										setCreateForm((current) => ({ ...current, type }));
									}}
									options={PARTY_TYPE_OPTIONS}
									value={createForm.type}
								/>
								<EnumFieldSelect
									label="Kind"
									onValueChange={(kind) => {
										setCreateForm((current) => ({ ...current, kind }));
									}}
									options={PARTY_KIND_OPTIONS}
									value={createForm.kind}
								/>
								<EnumFieldSelect
									label="Country"
									onValueChange={(country) => {
										setCreateForm((current) => ({ ...current, country }));
									}}
									options={COUNTRY_CODE_OPTIONS}
									value={createForm.country}
								/>
							</DialogPanel>
							<DialogFooter>
								<DialogClose
									render={<Button type="button" variant="outline" />}
								>
									Cancel
								</DialogClose>
								<Button loading={isPending} type="submit">
									Create
								</Button>
							</DialogFooter>
						</Form>
					</DialogPopup>
				</Dialog>
			)}
		</>
	);
}
