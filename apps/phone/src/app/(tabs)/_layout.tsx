import { TabList, TabSlot, TabTrigger, Tabs } from "expo-router/ui";
import { View } from "react-native";

import {
	BottomNavBar,
	leftTabs,
	PlayingButton,
	rightTabs,
	TabButton,
} from "@/components/navigation/bottomNav";
import { ToastHost } from "@/components/ui/toast";

// Tabs discovers routes from TabTriggers written directly inside TabList, so they stay in this layout.
export default function TabsLayout() {
	return (
		<Tabs className="flex-1 bg-background">
			<View className="flex-1">
				<TabSlot />
				<ToastHost />
			</View>
			<TabList asChild>
				<BottomNavBar>
					{leftTabs.map((tab) => (
						<TabTrigger asChild href={tab.href} key={tab.name} name={tab.name}>
							<TabButton icon={tab.icon} label={tab.label} />
						</TabTrigger>
					))}
					<TabTrigger asChild href="/" name="index">
						<PlayingButton />
					</TabTrigger>
					{rightTabs.map((tab) => (
						<TabTrigger asChild href={tab.href} key={tab.name} name={tab.name}>
							<TabButton icon={tab.icon} label={tab.label} />
						</TabTrigger>
					))}
				</BottomNavBar>
			</TabList>
		</Tabs>
	);
}
