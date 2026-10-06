import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";

type SearchFieldProps = {
	value: string;
	placeholder: string;
	onChangeText: (value: string) => void;
	autoFocus?: boolean;
};

export function SearchField({
	value,
	placeholder,
	onChangeText,
	autoFocus,
}: SearchFieldProps) {
	return (
		<View className="h-11 flex-1 flex-row items-center gap-2 rounded-full bg-surface px-4">
			<Icon className="accent-muted-foreground" name="search" size={18} />
			<TextInput
				accessibilityLabel={placeholder}
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				className="h-full flex-1 text-base text-foreground"
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColorClassName="accent-muted-foreground"
				returnKeyType="search"
				value={value}
			/>
			{!!value && (
				<Pressable
					accessibilityLabel="Clear search"
					accessibilityRole="button"
					hitSlop={13}
					onPress={() => onChangeText("")}
				>
					<Icon className="accent-muted-foreground" name="clear" size={18} />
				</Pressable>
			)}
		</View>
	);
}
