import type { ConfigContext, ExpoConfig } from "expo/config";

const isDev = process.env.APP_VARIANT === "development";
const identifier = isDev ? "com.alexchoicy.music.dev" : "com.alexchoicy.music";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: isDev ? "Music (Dev)" : "Music",
	slug: config.slug ?? "phone",
	ios: { ...config.ios, bundleIdentifier: identifier },
	android: {
		...config.android,
		package: identifier,
		version: isDev && config.version ? `${config.version}-dev` : config.version,
	},
});
