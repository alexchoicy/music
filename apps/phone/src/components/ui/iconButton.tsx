import type { PressableProps } from "react-native";
import { Pressable, Text, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<PressableProps, "children"> & {
	icon: IconName;
	label: string;
	badge?: number;
	className?: string;
};

export function IconButton({
	icon,
	label,
	badge,
	className,
	...props
}: IconButtonProps) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className={cn(
				"size-11 items-center justify-center rounded-lg border border-border bg-background active:opacity-70",
				className,
			)}
			{...props}
		>
			<Icon name={icon} size={20} />
			{!!badge && (
				<View className="absolute -top-1.5 -right-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
					<Text className="text-[11px] font-semibold text-primary-foreground">
						{badge}
					</Text>
				</View>
			)}
		</Pressable>
	);
}
