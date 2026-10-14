import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

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
	const [focused, setFocused] = useState(false);

	return (
		<View
			className={cn(
				"h-11 flex-1 flex-row items-center gap-2 rounded-lg border bg-card px-3",
				focused ? "border-primary" : "border-input",
			)}
		>
			<Icon className="accent-muted-foreground" name="search" size={18} />
			<TextInput
				accessibilityLabel={placeholder}
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				className="h-full flex-1 text-base text-foreground"
				onBlur={() => setFocused(false)}
				onChangeText={onChangeText}
				onFocus={() => setFocused(true)}
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
