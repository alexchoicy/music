import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";

type SearchFieldProps = {
	value: string;
	placeholder: string;
	onChangeText: (value: string) => void;
};

export function SearchField({
	value,
	placeholder,
	onChangeText,
}: SearchFieldProps) {
	return (
		<View className="h-11 flex-1 flex-row items-center gap-2 rounded-lg border border-border bg-background px-3">
			<Icon
				className="accent-muted-foreground"
				name={{
					ios: "magnifyingglass",
					android: "search",
					web: "search",
				}}
				size={18}
			/>
			<TextInput
				accessibilityLabel={placeholder}
				autoCapitalize="none"
				autoCorrect={false}
				className="flex-1 text-base text-foreground"
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
					<Icon
						className="accent-muted-foreground"
						name={{
							ios: "xmark.circle.fill",
							android: "cancel",
							web: "cancel",
						}}
						size={18}
					/>
				</Pressable>
			)}
		</View>
	);
}
