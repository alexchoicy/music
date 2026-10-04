import type { PressableProps } from "react-native";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { cn } from "@/lib/cn";

type ButtonProps = Omit<PressableProps, "children"> & {
	children: string;
	className?: string;
	loading?: boolean;
	variant?: "default" | "outline" | "ghost";
};

const variants = {
	default: {
		container: "bg-primary",
		text: "text-primary-foreground",
		indicator: "accent-primary-foreground",
	},
	outline: {
		container: "border border-border bg-background",
		text: "text-foreground",
		indicator: "accent-foreground",
	},
	ghost: {
		container: "",
		text: "text-foreground",
		indicator: "accent-foreground",
	},
};

export function Button({
	children,
	className,
	disabled,
	loading = false,
	variant = "default",
	...props
}: ButtonProps) {
	const styles = variants[variant];

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ busy: loading, disabled: disabled ?? false }}
			className={cn(
				"h-11 flex-row items-center justify-center gap-2 rounded-lg px-4 active:opacity-80 disabled:opacity-50",
				styles.container,
				className,
			)}
			disabled={disabled || loading}
			{...props}
		>
			{loading && <ActivityIndicator colorClassName={styles.indicator} />}
			<Text className={cn("text-base font-medium", styles.text)}>
				{children}
			</Text>
		</Pressable>
	);
}
