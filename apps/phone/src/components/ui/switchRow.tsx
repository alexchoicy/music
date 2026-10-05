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
	const muted = useCSSVariable("--color-muted-foreground");

	return (
		<View className="flex-row items-center gap-3">
			<View className="flex-1 gap-0.5">
				<Text className="text-sm font-medium text-foreground">{label}</Text>
				<Text className="text-xs text-muted-foreground">{description}</Text>
			</View>
			<Switch
				accessibilityHint={description}
				accessibilityLabel={label}
				onValueChange={onChange}
				trackColor={{ false: String(muted), true: String(primary) }}
				value={value}
			/>
		</View>
	);
}
