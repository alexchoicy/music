import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import type { ListSortOption } from "@/lib/album";
import { listSortOptions } from "@/lib/album";

type AlbumSortSheetProps = {
	open: boolean;
	sort: ListSortOption;
	onChange: (sort: ListSortOption) => void;
	onClose: () => void;
};

export function AlbumSortSheet({
	open,
	sort,
	onChange,
	onClose,
}: AlbumSortSheetProps) {
	return (
		<Sheet onClose={onClose} open={open} title="Sort by">
			<View>
				{listSortOptions.map((option) => (
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
