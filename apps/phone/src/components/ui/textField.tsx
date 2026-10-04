import type { ComponentPropsWithRef } from "react";
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
	...props
}: TextFieldProps) {
	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-foreground">{label}</Text>
			<TextInput
				accessibilityLabel={label}
				className={cn(
					"h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground",
					error && "border-destructive",
					className,
				)}
				placeholderTextColorClassName="accent-muted-foreground"
				{...props}
			/>
			{description && !error && (
				<Text className="text-sm text-muted-foreground">{description}</Text>
			)}
			{error && (
				<Text accessibilityRole="alert" className="text-sm text-destructive">
					{error}
				</Text>
			)}
		</View>
	);
}
