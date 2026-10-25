import { Image } from "expo-image";
import { useCSSVariable } from "uniwind";

import appMark from "@/assets/images/app-mark.svg";

/** The product mark from `assets/file.svg`, tinted with the foreground color. */
export function AppMark({ size = 40 }: { size?: number }) {
	const foreground = String(useCSSVariable("--color-foreground"));

	return (
		<Image
			accessible={false}
			contentFit="contain"
			source={appMark}
			// The mark's own proportions, 432 × 448.
			style={{ width: size * (432 / 448), height: size }}
			tintColor={foreground}
		/>
	);
}
