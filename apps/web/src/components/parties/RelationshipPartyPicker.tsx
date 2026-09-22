import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
	Combobox,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxStatus,
} from "#/components/coss/combobox";
import { Field, FieldLabel } from "#/components/coss/field";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { partyQueries } from "#/lib/queries/party.queries";

export type RelationshipPartyOption = { partyId: number; name: string };

export function RelationshipPartyPicker({
	label,
	value,
	onChange,
	excludedId,
	disabled,
}: {
	label: string;
	value: RelationshipPartyOption | null;
	onChange: (party: RelationshipPartyOption | null) => void;
	excludedId?: number;
	disabled: boolean;
}) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 250);
	const result = useQuery({
		...partyQueries.getParties({ Search: debouncedSearch, Limit: 20 }),
		placeholderData: keepPreviousData,
	});
	const items = (result.data ?? [])
		.filter((party) => Number(party.partyId) !== excludedId)
		.map((party) => ({ partyId: Number(party.partyId), name: party.name }));
	if (value && !items.some((item) => item.partyId === value.partyId))
		items.unshift(value);

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Combobox<RelationshipPartyOption>
				disabled={disabled}
				filter={null}
				isItemEqualToValue={(item, selected) =>
					item.partyId === selected.partyId
				}
				items={items}
				itemToStringLabel={(item) => item.name}
				itemToStringValue={(item) => String(item.partyId)}
				onInputValueChange={(text, details) => {
					if (
						details.reason === "input-change" ||
						details.reason === "input-clear"
					)
						setSearch(text);
				}}
				onValueChange={onChange}
				value={value}
			>
				<ComboboxInput
					aria-label={label}
					placeholder="Search parties…"
					showClear
				/>
				<ComboboxPopup className="w-(--anchor-width)">
					<ComboboxStatus>
						{result.isError
							? "Unable to search parties."
							: result.isFetching
								? "Searching…"
								: null}
					</ComboboxStatus>
					<ComboboxEmpty>No parties found.</ComboboxEmpty>
					<ComboboxList>
						{(item: RelationshipPartyOption) => (
							<ComboboxItem key={item.partyId} value={item}>
								<span className="min-w-0 flex-1 truncate">{item.name}</span>
								<span className="text-xs text-muted-foreground">
									#{item.partyId}
								</span>
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</Field>
	);
}
