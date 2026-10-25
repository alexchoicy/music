import type { ReactNode } from "react";
import type { PressableProps } from "react-native";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";

type ListRowProps = Omit<PressableProps, "children"> & {
	title: string;
	subtitle?: string;
	/** A line under the subtitle, e.g. a download status. */
	detail?: ReactNode;
	/** e.g. artwork or a track number. */
	leading?: ReactNode;
	/** Shown after the title, e.g. badges. */
	titleAccessory?: ReactNode;
	trailing?: ReactNode;
	/** Highlights the row, e.g. the track playing now. */
	active?: boolean;
	className?: string;
};

export function ListRow({
	title,
	subtitle,
	detail,
	leading,
	titleAccessory,
	trailing,
	active,
	className,
	...props
}: ListRowProps) {
	return (
		<Pressable
			className={cn(
				"min-h-16 flex-row items-center gap-3 py-2 active:opacity-60 disabled:opacity-45",
				className,
			)}
			{...props}
		>
			{leading}
			<View className="flex-1 gap-0.5">
				<View className="flex-row items-center gap-1.5">
					<Text
						className={cn(
							"shrink text-base",
							active ? "font-semibold text-primary" : "text-foreground",
						)}
						numberOfLines={1}
					>
						{title}
					</Text>
					{titleAccessory}
				</View>
				{!!subtitle && (
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{subtitle}
					</Text>
				)}
				{detail}
			</View>
			{trailing}
		</Pressable>
	);
}
