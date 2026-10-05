import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import type { PartyGender, PartyKind, PartyType } from "@/lib/party";
import { partyGenders, partyKinds, partyTypes } from "@/lib/party";

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

type PartyFilterSheetProps = {
	open: boolean;
	filters: PartyFilters;
	onChange: (filters: PartyFilters) => void;
	onClose: () => void;
};

type FilterGroupProps<T extends string> = {
	label: string;
	options: { label: string; value: T }[];
	value: T | null;
	onChange: (value: T | null) => void;
};

// The API accepts one value per filter, so selecting a chip replaces the previous one.
function FilterGroup<T extends string>({
	label,
	options,
	value,
	onChange,
}: FilterGroupProps<T>) {
	return (
		<View className="gap-2.5">
			<Text className="text-sm font-medium text-muted-foreground">{label}</Text>
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
		</View>
	);
}

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
						variant="outline"
					>
						Clear
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
			<FilterGroup
				label="Type"
				onChange={(type) => onChange({ ...filters, type })}
				options={partyTypes}
				value={filters.type}
			/>
			<FilterGroup
				label="Kind"
				onChange={(kind) => onChange({ ...filters, kind })}
				options={partyKinds}
				value={filters.kind}
			/>
			<FilterGroup
				label="Gender"
				onChange={(gender) => onChange({ ...filters, gender })}
				options={partyGenders}
				value={filters.gender}
			/>
			<View className="gap-2.5">
				<Text className="text-sm font-medium text-muted-foreground">
					Albums
				</Text>
				<View className="flex-row flex-wrap gap-2">
					<Chip
						label="Only with albums"
						onPress={() =>
							onChange({
								...filters,
								excludeNoAlbums: !filters.excludeNoAlbums,
							})
						}
						selected={filters.excludeNoAlbums}
					/>
				</View>
			</View>
		</Sheet>
	);
}
