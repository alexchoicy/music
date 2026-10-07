import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useCSSVariable } from "uniwind";

type BackdropProps = {
	uri: string | null;
	/** The height of the tinted area, fading into the background at its bottom. */
	height: number;
};

/** A blurred copy of artwork that tints the top of a page. */
export function Backdrop({ uri, height }: BackdropProps) {
	const background = String(useCSSVariable("--color-background"));
	if (!uri) return null;

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[styles.container, { height }]}
		>
			<Image
				blurRadius={50}
				cachePolicy="memory-disk"
				source={uri}
				style={[StyleSheet.absoluteFill, styles.image]}
			/>
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						experimental_backgroundImage: `linear-gradient(to bottom, ${background}66 0%, ${background}cc 55%, ${background} 100%)`,
					},
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { position: "absolute", top: 0, left: 0, right: 0 },
	image: { opacity: 0.6 },
});
