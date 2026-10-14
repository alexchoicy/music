import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { useId, useState } from "react";

import { Checkbox } from "#/components/base/checkbox";
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
import { Label } from "#/components/base/label";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { partyQueries } from "#/lib/queries/party.queries";

type PartyOption = {
	partyId: number;
	name: string;
	meta: string;
};

const SEARCH_DEBOUNCE_MS = 300;

type PartyFilterComboboxProps = {
	id?: string;
	label: string;
	placeholder?: string;
	selectedIds: number[];
	onSelectedIdsChange: (selectedIds: number[]) => void;
};

export function PartyFilterCombobox({
	id,
	label,
	placeholder = "Filter by parties",
	selectedIds,
	onSelectedIdsChange,
}: PartyFilterComboboxProps) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS).trim();
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

	const options: PartyOption[] = searchResults.map((party) => ({
		partyId: Number(party.partyId),
		name: party.name,
		meta: [
			COUNTRY_CODE[party.country],
			PARTY_KIND[party.kind],
			party.type ? PARTY_TYPE[party.type] : null,
		]
			.filter(Boolean)
			.join(" · "),
	}));
	const optionById = new Map(options.map((option) => [option.partyId, option]));

	// Selected parties outside the current results still need their names.
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
	const items = options.filter((option) => !selectedIdSet.has(option.partyId));
	const isSearching = query.trim() !== debouncedQuery || isFetching;

	return (
		<Combobox<PartyOption, true>
			filter={null}
			inputValue={query}
			items={items}
			itemToStringLabel={(option) => option.name}
			multiple
			onInputValueChange={setQuery}
			onValueChange={(next) => {
				onSelectedIdsChange(next.map((option) => option.partyId));
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
								aria-label={label}
								id={id}
								placeholder={value.length > 0 ? "" : placeholder}
							/>
							<ChevronDownIcon
								aria-hidden="true"
								className="me-1.5 size-4 shrink-0 self-center text-muted-foreground"
							/>
						</>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxPopup className="w-(--anchor-width)">
				<ComboboxStatus>
					{isSearching && items.length === 0
						? "Searching…"
						: isError
							? "Unable to search parties."
							: null}
				</ComboboxStatus>
				<ComboboxEmpty>No parties found.</ComboboxEmpty>
				<ComboboxList>
					{(option: PartyOption) => (
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
					)}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}

type PartyFilterFieldProps = {
	label: string;
	creditLabel: string;
	includeCredit: boolean;
	onIncludeCreditChange: (includeCredit: boolean) => void;
	selectedIds: number[];
	onSelectedIdsChange: (selectedIds: number[]) => void;
};

export function PartyFilterField({
	label,
	creditLabel,
	includeCredit,
	onIncludeCreditChange,
	selectedIds,
	onSelectedIdsChange,
}: PartyFilterFieldProps) {
	const inputId = useId();
	const creditId = useId();
	const hasParties = selectedIds.length > 0;

	return (
		<div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-80">
			<div className="flex items-center justify-between gap-3">
				<Label htmlFor={inputId} variant="muted">
					{label}
				</Label>
				<span className="flex items-center gap-1.5">
					<Checkbox
						checked={hasParties && includeCredit}
						disabled={!hasParties}
						id={creditId}
						onCheckedChange={(checked) =>
							onIncludeCreditChange(checked === true)
						}
					/>
					<Label htmlFor={creditId} variant="muted">
						{creditLabel}
					</Label>
				</span>
			</div>
			<PartyFilterCombobox
				id={inputId}
				label="Filter by parties"
				onSelectedIdsChange={onSelectedIdsChange}
				selectedIds={selectedIds}
			/>
		</div>
	);
}
