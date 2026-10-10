import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";
import type { Option } from "@/lib/music";

type SegmentedProps<T extends string> = {
	label: string;
	options: Option<T>[];
	value: T;
	onChange: (value: T) => void;
};

/** A choice between a few options, e.g. Original or Efficient. */
export function Segmented<T extends string>({
	label,
	options,
	value,
	onChange,
}: SegmentedProps<T>) {
	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="radiogroup"
			className="flex-row rounded-full bg-surface-strong p-1"
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						accessibilityRole="radio"
						accessibilityState={{ checked: selected }}
						className={cn(
							"h-10 flex-1 items-center justify-center rounded-full active:opacity-70",
							selected && "bg-background",
						)}
						key={option.value}
						onPress={() => onChange(option.value)}
					>
						<Text
							className={cn(
								"text-sm",
								selected
									? "font-semibold text-foreground"
									: "font-medium text-muted-foreground",
							)}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
