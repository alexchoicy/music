import type { ConfigContext, ExpoConfig } from "expo/config";
// import { withAndroidManifest } from "expo/config-plugins";

const isDev = process.env.APP_VARIANT === "development";
const identifier = isDev ? "com.alexchoicy.music.dev" : "com.alexchoicy.music";

// const withProfileable = (config: ExpoConfig) =>
// 	withAndroidManifest(config, (manifest) => {
// 		const application = manifest.modResults.manifest.application?.[0];
// 		if (application) {
// 			Object.assign(application, {
// 				profileable: [{ $: { "android:shell": "true" } }],
// 			});
// 		}
// 		return manifest;
// 	});

export default ({ config }: ConfigContext): ExpoConfig => {
	const appConfig: ExpoConfig = {
		...config,
		name: isDev ? "Music (Dev)" : "Music",
		slug: config.slug ?? "phone",
		ios: { ...config.ios, bundleIdentifier: identifier },
		android: {
			...config.android,
			package: identifier,
			version:
				isDev && config.version ? `${config.version}-dev` : config.version,
		},
	};
	return appConfig;
	// return isDev ? withProfileable(appConfig) : appConfig;
};
