import { Tabs } from "expo-router/js-tabs";

import { TabBar } from "@/components/navigation/tabBar";

export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{ headerShown: false, animation: "fade" }}
			tabBar={(props) => <TabBar {...props} />}
		>
			<Tabs.Screen name="(albums)" />
			<Tabs.Screen name="(parties)" />
			<Tabs.Screen name="(search)" />
			<Tabs.Screen name="(playlists)" />
			<Tabs.Screen name="(settings)" />
		</Tabs>
	);
}
