import { View } from "react-native";

import { cn } from "@/lib/cn";
import { useShadow } from "@/lib/shadows";

/** The restrained glow around artwork that is playing now; place it over the artwork. */
export function PlayingGlow({ className }: { className?: string }) {
	const glow = useShadow("glowPrimary");
	return (
		<View
			className={cn("absolute inset-0", className)}
			pointerEvents="none"
			style={glow}
		/>
	);
}
