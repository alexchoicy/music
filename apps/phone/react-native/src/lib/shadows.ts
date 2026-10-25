import { useUniwind } from "uniwind";

// DESIGN.md elevation tokens. Android ignores them as theme classes, so they
// apply as native `boxShadow` styles instead.
const shadows = {
	light: {
		pop: "0 12px 32px #1b19162e, 0 0 0 1px #1b191614",
		player: "0 12px 40px #1b19162e, 0 0 0 1px #1b191614",
		glowPrimary: "0 0 0 1px #aa224966, 0 0 16px #aa224926",
	},
	dark: {
		pop: "0 12px 32px #000000a6, 0 0 0 1px #ffffff14",
		player: "0 12px 40px #000000b3, 0 0 0 1px #ffffff14",
		glowPrimary: "0 0 0 1px #e8758b66, 0 0 24px #e8758b33",
	},
};

export type ShadowName = keyof typeof shadows.light;

/** A style with the theme's shadow, e.g. `style={useShadow("pop")}`. */
export function useShadow(name: ShadowName) {
	const { theme } = useUniwind();
	return { boxShadow: shadows[theme === "dark" ? "dark" : "light"][name] };
}
