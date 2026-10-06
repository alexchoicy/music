import { Switch, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";

type SwitchRowProps = {
	label: string;
	description: string;
	value: boolean;
	onChange: (value: boolean) => void;
};

export function SwitchRow({
	label,
	description,
	value,
	onChange,
}: SwitchRowProps) {
	const primary = useCSSVariable("--color-primary");
	const track = useCSSVariable("--color-surface-strong");

	return (
		<View className="min-h-12 flex-row items-center gap-3">
			<View className="flex-1 gap-0.5">
				<Text className="text-base text-foreground">{label}</Text>
				<Text className="text-xs leading-4 text-muted-foreground">
					{description}
				</Text>
			</View>
			<Switch
				accessibilityHint={description}
				accessibilityLabel={label}
				onValueChange={onChange}
				trackColor={{ false: String(track), true: String(primary) }}
				value={value}
			/>
		</View>
	);
}
