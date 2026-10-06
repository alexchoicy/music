import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { MiniPlayer } from "@/components/player/miniPlayer";
import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { ToastHost } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useKeyboardVisible } from "@/lib/hooks";
import { setCurrentTab } from "@/lib/navigation";
import { useMiniPlayerStore } from "@/store/miniPlayerStore";

export const tabs: Record<string, { label: string; icon: IconName }> = {
	"(albums)": { label: "Albums", icon: "albums" },
	"(parties)": { label: "Parties", icon: "parties" },
	"(search)": { label: "Search", icon: "search" },
	"(playlists)": { label: "Playlists", icon: "playlist" },
	"(settings)": { label: "Settings", icon: "settings" },
};

/** The mini player and the tabs below it; hidden while the keyboard is up. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
	const keyboardVisible = useKeyboardVisible();
	const tabName = state.routes[state.index].name;
	useEffect(() => setCurrentTab(tabName), [tabName]);

	// The bar overlaps the screen by the mini player's height, so the mini
	// player floats over the content while still receiving touches.
	const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);
	const overlap = keyboardVisible ? 0 : miniPlayerHeight;
	useEffect(() => useMiniPlayerStore.setState({ overlap }), [overlap]);

	return (
		<View pointerEvents="box-none" style={{ marginTop: -overlap }}>
			<ToastHost aboveParent />
			{!keyboardVisible && (
				<View
					pointerEvents="box-none"
					style={{ paddingLeft: insets.left, paddingRight: insets.right }}
				>
					<View
						onLayout={(event) =>
							setMiniPlayerHeight(event.nativeEvent.layout.height)
						}
						pointerEvents="box-none"
					>
						<MiniPlayer />
					</View>
					<View
						accessibilityRole="tablist"
						className="flex-row border-t border-border bg-background pt-1"
						style={{ paddingBottom: insets.bottom }}
					>
						{state.routes.map((route, index) => {
							const tab = tabs[route.name];
							const focused = state.index === index;
							return (
								<Pressable
									accessibilityLabel={tab.label}
									accessibilityRole="tab"
									accessibilityState={{ selected: focused }}
									className="h-14 flex-1 items-center justify-center gap-1 active:opacity-60"
									key={route.key}
									onPress={() => {
										const event = navigation.emit({
											type: "tabPress",
											target: route.key,
											canPreventDefault: true,
										});
										if (!focused && !event.defaultPrevented) {
											navigation.navigate(route.name, route.params);
										}
									}}
								>
									<Icon
										className={
											focused ? "accent-primary" : "accent-muted-foreground"
										}
										name={tab.icon}
										size={24}
									/>
									<Text
										className={cn(
											"text-[11px]",
											focused
												? "font-semibold text-primary"
												: "font-medium text-muted-foreground",
										)}
										numberOfLines={1}
									>
										{tab.label}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
			)}
		</View>
	);
}
