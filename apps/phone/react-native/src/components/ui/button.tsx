import type { PressableProps } from "react-native";
import { ActivityIndicator, Pressable, Text } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type ButtonProps = Omit<PressableProps, "children"> & {
	children: string;
	className?: string;
	icon?: IconName;
	loading?: boolean;
	variant?:
		| "primary"
		| "secondary"
		| "outline"
		| "ghost"
		| "destructive"
		| "destructiveFilled";
};

const variants = {
	primary: {
		container: "bg-primary",
		text: "text-primary-foreground",
		tint: "accent-primary-foreground",
	},
	secondary: {
		container: "bg-secondary",
		text: "text-foreground",
		tint: "accent-foreground",
	},
	outline: {
		container: "border border-input bg-card",
		text: "text-foreground",
		tint: "accent-foreground",
	},
	ghost: {
		container: "",
		text: "text-foreground",
		tint: "accent-foreground",
	},
	destructive: {
		container: "border border-input bg-card",
		text: "text-destructive-foreground",
		tint: "accent-destructive-foreground",
	},
	destructiveFilled: {
		container: "bg-destructive",
		text: "text-on-destructive",
		tint: "accent-on-destructive",
	},
};

export function Button({
	children,
	className,
	disabled,
	icon,
	loading = false,
	variant = "primary",
	...props
}: ButtonProps) {
	const styles = variants[variant];

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ busy: loading, disabled: !!disabled }}
			className={cn(
				"h-12 flex-row items-center justify-center gap-2 rounded-lg px-5 active:opacity-75 disabled:opacity-45",
				styles.container,
				className,
			)}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? (
				<ActivityIndicator colorClassName={styles.tint} />
			) : (
				icon && <Icon className={styles.tint} name={icon} size={18} />
			)}
			<Text className={cn("text-base font-medium", styles.text)}>
				{children}
			</Text>
		</Pressable>
	);
}
