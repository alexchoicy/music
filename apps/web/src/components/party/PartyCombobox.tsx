import type * as API from "@music/api";
import {
	keepPreviousData,
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "#/components/base/button";
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
} from "#/components/base/combobox";
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldLabel } from "#/components/base/field";
import { Form } from "#/components/base/form";
import { Input } from "#/components/base/input";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	COUNTRY_CODE,
	COUNTRY_CODE_OPTIONS,
	PARTY_KIND,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { partyMutation, partyQueries } from "#/lib/queries/party.queries";
import { searchPartyByNormalizedName } from "#/lib/utils/party";
import { normalizeString } from "#/lib/utils/string";

type PartyOption = {
	partyId: number;
	name: string;
	meta: string;
	creatableName?: string;
};

type CreatePartyForm = Pick<
	API.CreatePartyRequest,
	"country" | "kind" | "name" | "type"
>;

type PartyComboboxProps = {
	allowCreate?: boolean;
	ariaLabel: string;
	disabled?: boolean;
	placeholder?: string;
	selectedIds: number[];
	setSelectedIds: (selectedIds: number[]) => void;
};

const SEARCH_DEBOUNCE_MS = 300;
const CREATE_OPTION_ID = 0;

function toOption(party: API.PartyItems): PartyOption {
	return {
		partyId: Number(party.partyId),
		name: party.name,
		meta: [
			COUNTRY_CODE[party.country],
			PARTY_KIND[party.kind],
			party.type ? PARTY_TYPE[party.type] : null,
		]
			.filter(Boolean)
			.join(" · "),
	};
}

export function PartyCombobox({
	allowCreate = false,
	ariaLabel,
	disabled,
	placeholder = "Search parties...",
	selectedIds,
	setSelectedIds,
}: PartyComboboxProps) {
	const queryClient = useQueryClient();
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS).trim();
	const [createForm, setCreateForm] = useState<CreatePartyForm | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const highlightedRef = useRef<PartyOption | undefined>(undefined);

	const { isPending: isCreating, mutateAsync: createParty } = useMutation(
		partyMutation.createParty(),
	);
	const { data: allParties = [] } = useQuery(partyQueries.getParties());
	const {
		data: searchResults = [],
		isError,
		isFetching,
	} = useQuery({
		...partyQueries.getParties(
			debouncedQuery ? { Search: debouncedQuery } : undefined,
		),
		placeholderData: keepPreviousData,
	});

	const knownParties = [...allParties, ...searchResults];
	const optionById = new Map(
		knownParties.map((party) => [Number(party.partyId), toOption(party)]),
	);

	// Selected parties outside the loaded lists still need their names.
	const missingDetails = useQueries({
		queries: selectedIds
			.filter((partyId) => !optionById.has(partyId))
			.map((partyId) => partyQueries.getParty(partyId)),
	});
	for (const result of missingDetails) {
		if (!result.data) continue;
		const partyId = Number(result.data.partyId);
		optionById.set(partyId, { partyId, name: result.data.name, meta: "" });
	}

	const selected = selectedIds
		.map((partyId) => optionById.get(partyId))
		.filter((option): option is PartyOption => option !== undefined);
	const selectedIdSet = new Set(selectedIds);
	const results = searchResults
		.map(toOption)
		.filter((option) => !selectedIdSet.has(option.partyId));

	const trimmedQuery = query.trim();
	const isSearching = trimmedQuery !== debouncedQuery || isFetching;
	const canCreate =
		allowCreate &&
		trimmedQuery !== "" &&
		!isSearching &&
		!searchPartyByNormalizedName(knownParties, normalizeString(trimmedQuery));
	const items: PartyOption[] = canCreate
		? [
				...results,
				{
					partyId: CREATE_OPTION_ID,
					name: trimmedQuery,
					meta: "",
					creatableName: trimmedQuery,
				},
			]
		: results;

	function openCreateDialog(name: string) {
		setCreateForm({
			country: "XX",
			kind: "Human",
			name,
			type: "Individual",
		});
		setIsCreateOpen(true);
	}

	function selectParty(partyId: number) {
		if (!selectedIdSet.has(partyId)) setSelectedIds([...selectedIds, partyId]);
		setQuery("");
		setIsCreateOpen(false);
	}

	async function handleCreateSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();
		if (!createForm) return;

		const name = createForm.name.trim();
		if (!name) return;

		const existing = searchPartyByNormalizedName(
			knownParties,
			normalizeString(name),
		);
		if (existing) {
			selectParty(Number(existing.partyId));
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
		selectParty(Number(result.partyId));
	}

	return (
		<>
			<Combobox<PartyOption, true>
				disabled={disabled}
				filter={null}
				inputValue={query}
				items={items}
				itemToStringLabel={(option) => option.name}
				multiple
				onInputValueChange={setQuery}
				onItemHighlighted={(option) => {
					highlightedRef.current = option;
				}}
				onValueChange={(next) => {
					const creatable = next.find((option) => option.creatableName);
					if (creatable?.creatableName) {
						openCreateDialog(creatable.creatableName);
						return;
					}

					setSelectedIds(next.map((option) => option.partyId));
					setQuery("");
				}}
				value={selected}
			>
				<ComboboxChips>
					<ComboboxValue>
						{(value: PartyOption[]) => (
							<>
								{value.map((option) => (
									<ComboboxChip
										key={option.partyId}
										removeProps={{ "aria-label": `Remove ${option.name}` }}
									>
										{option.name}
									</ComboboxChip>
								))}
								<ComboboxChipsInput
									aria-label={ariaLabel}
									onKeyDown={(event) => {
										if (
											event.key !== "Enter" ||
											highlightedRef.current ||
											!canCreate
										)
											return;

										event.preventDefault();
										openCreateDialog(trimmedQuery);
									}}
									placeholder={value.length > 0 ? "" : placeholder}
								/>
							</>
						)}
					</ComboboxValue>
				</ComboboxChips>
				<ComboboxPopup className="w-(--anchor-width)">
					<ComboboxStatus>
						{isSearching && results.length === 0
							? "Searching…"
							: isError
								? "Unable to search parties."
								: null}
					</ComboboxStatus>
					<ComboboxEmpty>No parties found.</ComboboxEmpty>
					<ComboboxList>
						{(option: PartyOption) =>
							option.creatableName ? (
								<ComboboxItem key="create" value={option}>
									<span className="flex min-w-0 items-center gap-2">
										<PlusIcon aria-hidden="true" className="size-4 shrink-0" />
										<span className="truncate">
											Create "{option.creatableName}"
										</span>
									</span>
								</ComboboxItem>
							) : (
								<ComboboxItem key={option.partyId} value={option}>
									<span className="flex min-w-0 flex-col">
										<span className="truncate">{option.name}</span>
										{option.meta && (
											<span className="truncate text-xs text-muted-foreground">
												{option.meta}
											</span>
										)}
									</span>
								</ComboboxItem>
							)
						}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>

			{allowCreate && (
				<Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Create party</DialogTitle>
						</DialogHeader>
						{createForm && (
							<Form className="contents" onSubmit={handleCreateSubmit}>
								<DialogPanel>
									<div className="grid gap-4">
										<Field name="name">
											<FieldLabel>Name</FieldLabel>
											<Input
												autoComplete="off"
												onChange={(event) =>
													setCreateForm({
														...createForm,
														name: event.target.value,
													})
												}
												required
												value={createForm.name}
											/>
										</Field>
										<FilterSelect
											label="Type"
											onValueChange={(type) =>
												setCreateForm({ ...createForm, type })
											}
											options={PARTY_TYPE_OPTIONS}
											value={createForm.type}
										/>
										<FilterSelect
											label="Kind"
											onValueChange={(kind) =>
												setCreateForm({ ...createForm, kind })
											}
											options={PARTY_KIND_OPTIONS}
											value={createForm.kind}
										/>
										<FilterSelect
											label="Country"
											onValueChange={(country) =>
												setCreateForm({ ...createForm, country })
											}
											options={COUNTRY_CODE_OPTIONS}
											value={createForm.country}
										/>
									</div>
								</DialogPanel>
								<DialogFooter>
									<DialogClose
										render={<Button type="button" variant="outline" />}
									>
										Cancel
									</DialogClose>
									<Button loading={isCreating} type="submit">
										Create
									</Button>
								</DialogFooter>
							</Form>
						)}
					</DialogPopup>
				</Dialog>
			)}
		</>
	);
}
