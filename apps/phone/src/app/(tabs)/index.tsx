import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";
import { usePlayerStore } from "@/store/playerStore";

export default function PlayingScreen() {
	const isPlaying = usePlayerStore((state) => state.isPlaying);
	const togglePlayback = usePlayerStore((state) => state.togglePlayback);

	return (
		<Screen>
			<EmptyState
				description="Pick something from your library to start listening."
				title="Nothing playing"
			/>
			<View className="items-center p-6">
				<Button onPress={togglePlayback}>{isPlaying ? "Pause" : "Play"}</Button>
			</View>
		</Screen>
	);
}
