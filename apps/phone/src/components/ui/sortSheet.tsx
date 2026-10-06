import { View } from "react-native";

import { RadioRow, Sheet } from "@/components/ui/sheet";
import type { Option } from "@/lib/music";
import type { ListSortOption } from "@/lib/schema";

type SortSheetProps = {
	open: boolean;
	sort: ListSortOption;
	options: Option<ListSortOption>[];
	onChange: (sort: ListSortOption) => void;
	onClose: () => void;
};

export function SortSheet({
	open,
	sort,
	options,
	onChange,
	onClose,
}: SortSheetProps) {
	return (
		<Sheet onClose={onClose} open={open} title="Sort by">
			<View accessibilityRole="radiogroup">
				{options.map((option) => (
					<RadioRow
						key={option.value}
						label={option.label}
						onPress={() => {
							onChange(option.value);
							onClose();
						}}
						selected={option.value === sort}
					/>
				))}
			</View>
		</Sheet>
	);
}
