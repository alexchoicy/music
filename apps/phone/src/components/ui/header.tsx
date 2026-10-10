import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { IconButton } from "@/components/ui/iconButton";

type PageHeaderProps = {
	title: string;
	subtitle?: string;
	/** Buttons at the trailing edge, e.g. Filter and Sort. */
	actions?: ReactNode;
};

/** The large title at the top of a tab. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
	return (
		<View className="min-h-14 flex-row items-center gap-2 px-4 pt-2">
			<View className="flex-1">
				<Text
					accessibilityRole="header"
					className="text-3xl font-bold tracking-tight text-foreground"
					numberOfLines={1}
				>
					{title}
				</Text>
				{subtitle && (
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{subtitle}
					</Text>
				)}
			</View>
			{actions && <View className="flex-row items-center">{actions}</View>}
		</View>
	);
}

type TopBarProps = {
	/** A compact title, e.g. on a pushed list. */
	title?: string;
	actions?: ReactNode;
	/** `close` for screens presented from the bottom. */
	leading?: "back" | "close";
	/** Replaces going back, e.g. to close a sheet that is not a route. */
	onLeadingPress?: () => void;
};

/** The bar of a pushed or presented screen, with a way back. */
export function TopBar({
	title,
	actions,
	leading = "back",
	onLeadingPress = () => router.back(),
}: TopBarProps) {
	return (
		<View className="h-14 flex-row items-center gap-1 px-2">
			<IconButton
				icon={leading === "back" ? "back" : "chevronDown"}
				label={leading === "back" ? "Back" : "Close"}
				onPress={onLeadingPress}
				size={48}
			/>
			<Text
				accessibilityRole={title ? "header" : undefined}
				className="flex-1 text-center text-base font-semibold text-foreground"
				numberOfLines={1}
			>
				{title}
			</Text>
			{/* Keeps the title centered when there are no actions. */}
			<View className="min-w-12 flex-row items-center justify-end">
				{actions}
			</View>
		</View>
	);
}

type SectionHeaderProps = {
	title: string;
	detail?: string;
	action?: ReactNode;
};

export function SectionHeader({ title, detail, action }: SectionHeaderProps) {
	return (
		<View className="min-h-11 flex-row items-center gap-2">
			<View className="flex-1 flex-row items-baseline gap-2">
				<Text
					accessibilityRole="header"
					className="text-lg font-bold text-foreground"
				>
					{title}
				</Text>
				{detail && (
					<Text className="text-sm text-muted-foreground">{detail}</Text>
				)}
			</View>
			{action}
		</View>
	);
}
