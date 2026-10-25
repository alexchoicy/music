import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";

import { TabBar } from "@/components/navigation/tabBar";
import { NowPlayingSheet } from "@/components/player/nowPlayingSheet";
import { QueueSheet } from "@/components/player/queueSheet";

export default function TabsLayout() {
	return (
		<View className="flex-1">
			<Tabs
				screenOptions={{ headerShown: false }}
				tabBar={(props) => <TabBar {...props} />}
			>
				<Tabs.Screen name="(home)" />
				<Tabs.Screen name="(albums)" />
				<Tabs.Screen name="(parties)" />
				<Tabs.Screen name="(search)" />
				<Tabs.Screen name="(playlists)" />
				<Tabs.Screen name="(settings)" />
			</Tabs>
			<NowPlayingSheet />
			<QueueSheet />
		</View>
	);
}
