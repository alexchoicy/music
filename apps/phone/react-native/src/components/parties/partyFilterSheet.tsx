import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, SheetSection } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switchRow";
import type { Option } from "@/lib/music";
import { partyGenders, partyKinds, partyTypes } from "@/lib/music";
import type { PartyGender, PartyKind, PartyType } from "@/lib/schema";

export type PartyFilters = {
	type: PartyType | null;
	kind: PartyKind | null;
	gender: PartyGender | null;
	excludeNoAlbums: boolean;
};

export const defaultPartyFilters: PartyFilters = {
	type: null,
	kind: null,
	gender: null,
	excludeNoAlbums: true,
};

export function countPartyFilters(filters: PartyFilters) {
	return (
		[filters.type, filters.kind, filters.gender].filter(Boolean).length +
		(filters.excludeNoAlbums === defaultPartyFilters.excludeNoAlbums ? 0 : 1)
	);
}

type ChoiceProps<T extends string> = {
	label: string;
	options: Option<T>[];
	value: T | null;
	onChange: (value: T | null) => void;
};

// The API takes one value per filter, so a chip replaces the previous choice.
function Choice<T extends string>({
	label,
	options,
	value,
	onChange,
}: ChoiceProps<T>) {
	return (
		<SheetSection label={label}>
			<View
				accessibilityLabel={label}
				accessibilityRole="radiogroup"
				className="flex-row flex-wrap gap-2"
			>
				{options.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						onPress={() =>
							onChange(option.value === value ? null : option.value)
						}
						role="radio"
						selected={option.value === value}
					/>
				))}
			</View>
		</SheetSection>
	);
}

type PartyFilterSheetProps = {
	open: boolean;
	filters: PartyFilters;
	onChange: (filters: PartyFilters) => void;
	onClose: () => void;
};

export function PartyFilterSheet({
	open,
	filters,
	onChange,
	onClose,
}: PartyFilterSheetProps) {
	return (
		<Sheet
			footer={
				<>
					<Button
						className="flex-1"
						onPress={() => onChange(defaultPartyFilters)}
						variant="secondary"
					>
						Reset
					</Button>
					<Button className="flex-1" onPress={onClose}>
						Done
					</Button>
				</>
			}
			onClose={onClose}
			open={open}
			title="Filter parties"
		>
			<SwitchRow
				description="Hide parties without releases in your library."
				label="Only with albums"
				onChange={(excludeNoAlbums) =>
					onChange({ ...filters, excludeNoAlbums })
				}
				value={filters.excludeNoAlbums}
			/>
			<Choice
				label="Type"
				onChange={(type) => onChange({ ...filters, type })}
				options={partyTypes}
				value={filters.type}
			/>
			<Choice
				label="Kind"
				onChange={(kind) => onChange({ ...filters, kind })}
				options={partyKinds}
				value={filters.kind}
			/>
			<Choice
				label="Gender"
				onChange={(gender) => onChange({ ...filters, gender })}
				options={partyGenders}
				value={filters.gender}
			/>
		</Sheet>
	);
}
