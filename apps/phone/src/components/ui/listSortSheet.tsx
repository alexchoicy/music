import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import type { ListSortOption } from "@/lib/listSort";
import { listSortOptions } from "@/lib/listSort";

type ListSortSheetProps = {
	open: boolean;
	sort: ListSortOption;
	options?: { label: string; value: ListSortOption }[];
	onChange: (sort: ListSortOption) => void;
	onClose: () => void;
};

export function ListSortSheet({
	open,
	sort,
	options = listSortOptions,
	onChange,
	onClose,
}: ListSortSheetProps) {
	return (
		<Sheet onClose={onClose} open={open} title="Sort by">
			<View>
				{options.map((option) => (
					<Pressable
						accessibilityRole="radio"
						accessibilityState={{ checked: option.value === sort }}
						className="h-12 flex-row items-center justify-between active:opacity-70"
						key={option.value}
						onPress={() => {
							onChange(option.value);
							onClose();
						}}
					>
						<Text className="text-base text-foreground">{option.label}</Text>
						{option.value === sort && (
							<Icon
								name={{ ios: "checkmark", android: "check", web: "check" }}
								size={20}
							/>
						)}
					</Pressable>
				))}
			</View>
		</Sheet>
	);
}
