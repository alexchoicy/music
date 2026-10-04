import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";

export default function QueueScreen() {
	return (
		<Screen>
			<EmptyState
				description="Tracks you play next will appear here."
				title="Queue is empty"
			/>
		</Screen>
	);
}
