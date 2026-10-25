import type { ComponentPropsWithRef } from "react";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { cn } from "@/lib/cn";

type TextFieldProps = ComponentPropsWithRef<typeof TextInput> & {
	label: string;
	description?: string;
	error?: string;
};

export function TextField({
	label,
	description,
	error,
	className,
	onFocus,
	onBlur,
	...props
}: TextFieldProps) {
	const [focused, setFocused] = useState(false);

	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-foreground">{label}</Text>
			<TextInput
				accessibilityLabel={label}
				className={cn(
					"h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground",
					focused && "border-primary",
					error && "border-destructive",
					className,
				)}
				onBlur={(event) => {
					setFocused(false);
					onBlur?.(event);
				}}
				onFocus={(event) => {
					setFocused(true);
					onFocus?.(event);
				}}
				placeholderTextColorClassName="accent-muted-foreground"
				{...props}
			/>
			{error ? (
				<Text
					accessibilityRole="alert"
					className="text-sm text-destructive-foreground"
				>
					{error}
				</Text>
			) : (
				description && (
					<Text className="text-sm text-muted-foreground">{description}</Text>
				)
			)}
		</View>
	);
}
