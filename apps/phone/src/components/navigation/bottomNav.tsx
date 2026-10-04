import type { TabTriggerSlotProps } from "expo-router/ui";
import type { ReactNode, Ref } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { usePlayerStore } from "@/store/playerStore";

type TabConfig = {
	name: string;
	href: string;
	label: string;
	icon: IconName;
};

export const leftTabs = [
	{
		name: "queue",
		href: "/queue",
		label: "Queue",
		icon: { ios: "list.bullet", android: "queue_music", web: "queue_music" },
	},
	{
		name: "albums",
		href: "/albums",
		label: "Albums",
		icon: { ios: "square.stack", android: "album", web: "album" },
	},
	{
		name: "parties",
		href: "/parties",
		label: "Parties",
		icon: { ios: "music.mic", android: "artist", web: "artist" },
	},
] as const satisfies readonly TabConfig[];

export const rightTabs = [
	{
		name: "playlists",
		href: "/playlists",
		label: "Playlists",
		icon: {
			ios: "music.note.list",
			android: "playlist_play",
			web: "playlist_play",
		},
	},
	{
		name: "search",
		href: "/search",
		label: "Search",
		icon: { ios: "magnifyingglass", android: "search", web: "search" },
	},
	{
		name: "settings",
		href: "/settings",
		label: "Settings",
		icon: { ios: "gearshape", android: "settings", web: "settings" },
	},
] as const satisfies readonly TabConfig[];

type TabButtonProps = TabTriggerSlotProps & {
	label: string;
	icon: IconName;
	ref?: Ref<View>;
};

// TabTrigger passes a row layout style; it is dropped so the className layout applies.
export function TabButton({
	label,
	icon,
	isFocused,
	style: _style,
	...props
}: TabButtonProps) {
	return (
		<Pressable
			accessibilityLabel={label}
			className="flex-1 items-center justify-center gap-0.5 py-1.5 active:opacity-70"
			{...props}
		>
			<View className="px-3 py-1">
				{/* Android drops the rounded corners when a view's background changes, so only the opacity toggles. */}
				<View
					className="absolute inset-0 rounded-full bg-muted"
					style={{ opacity: isFocused ? 1 : 0 }}
				/>
				<Icon
					className={
						isFocused ? "accent-foreground" : "accent-muted-foreground"
					}
					name={icon}
					size={22}
				/>
			</View>
			<Text
				className={cn(
					"text-[10px]",
					isFocused ? "font-semibold text-foreground" : "text-muted-foreground",
				)}
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
}

type PlayingButtonProps = TabTriggerSlotProps & {
	ref?: Ref<View>;
};

// Opens the Playing screen; the icon mirrors the playback state.
export function PlayingButton({
	isFocused: _isFocused,
	style: _style,
	...props
}: PlayingButtonProps) {
	const isPlaying = usePlayerStore((state) => state.isPlaying);

	return (
		<Pressable
			accessibilityLabel="Now playing"
			className="flex-1 items-center justify-center active:opacity-70"
			{...props}
		>
			<View className="size-11 items-center justify-center rounded-full bg-primary">
				<Icon
					className="accent-primary-foreground"
					name={
						isPlaying
							? { ios: "pause.fill", android: "pause", web: "pause" }
							: { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
					}
					size={24}
				/>
			</View>
		</Pressable>
	);
}

type BottomNavBarProps = {
	children: ReactNode;
};

// TabList passes a row layout style; it is dropped so the className layout applies.
export function BottomNavBar({ children }: BottomNavBarProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-row border-t border-border bg-background"
			style={{
				paddingBottom: insets.bottom,
				paddingLeft: insets.left,
				paddingRight: insets.right,
			}}
		>
			{children}
		</View>
	);
}
