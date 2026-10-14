import { Text, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type BadgeProps = {
	label: string;
	icon?: IconName;
	/** `artwork` sits over a cover; `outline` for secondary details. */
	variant?: "secondary" | "outline" | "artwork";
	/** `tag` is the taller label used over artwork and in heroes. */
	size?: "default" | "tag";
	/** Keeps the icon and accessible label but hides the text, e.g. on small tiles. */
	iconOnly?: boolean;
	className?: string;
};

const variants = {
	secondary: "bg-secondary",
	outline: "border border-input",
	artwork: "bg-background/80",
};

export function Badge({
	label,
	icon,
	variant = "secondary",
	size = "default",
	iconOnly = false,
	className,
}: BadgeProps) {
	return (
		<View
			accessibilityLabel={iconOnly ? label : undefined}
			accessible={iconOnly}
			className={cn(
				"flex-row items-center gap-1 rounded-sm",
				size === "tag" ? "h-6 px-2" : "h-5 px-1.5",
				iconOnly && "w-6 justify-center px-0",
				variants[variant],
				className,
			)}
		>
			{icon && <Icon className="accent-foreground" name={icon} size={14} />}
			{!iconOnly && (
				<Text className="text-xs font-medium text-foreground" numberOfLines={1}>
					{label}
				</Text>
			)}
		</View>
	);
}
