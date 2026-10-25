import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { isOnWifi } from "@/lib/network";

/** `original` is the uploaded file (e.g. FLAC); `efficient` is 96 kbps Opus when available. */
export type AudioQuality = "original" | "efficient";

/** `auto` streams originals on Wi‑Fi and Efficient on mobile data. */
export type StreamingQuality = AudioQuality | "auto";

type Settings = {
	streamingQuality: StreamingQuality;
	downloadQuality: AudioQuality;
	/** Saves played tracks for offline; on Wi‑Fi they stream and save as originals. */
	savePlayedTracks: boolean;
};

type SettingsState = Settings & {
	update: (settings: Partial<Settings>) => void;
};

const storageKey = "settings";

const defaults: Settings = {
	streamingQuality: "auto",
	downloadQuality: "original",
	savePlayedTracks: false,
};

function loadSettings(): Settings {
	const saved = Storage.getItemSync(storageKey);
	return saved ? (JSON.parse(saved) as Settings) : defaults;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
	...loadSettings(),
	update: (settings) => {
		set(settings);
		const { streamingQuality, downloadQuality, savePlayedTracks } = get();
		Storage.setItemSync(
			storageKey,
			JSON.stringify({ streamingQuality, downloadQuality, savePlayedTracks }),
		);
	},
}));

/** The quality to stream at now; played tracks are saved as originals on Wi‑Fi. */
export function getStreamingQuality(
	settings: Settings = useSettingsStore.getState(),
): AudioQuality {
	if (
		isOnWifi() &&
		(settings.streamingQuality === "auto" || settings.savePlayedTracks)
	) {
		return "original";
	}
	return settings.streamingQuality === "auto"
		? "efficient"
		: settings.streamingQuality;
}

export const streamingQualityOptions: {
	label: string;
	value: StreamingQuality;
}[] = [
	{ label: "Auto", value: "auto" },
	{ label: "Original", value: "original" },
	{ label: "Efficient", value: "efficient" },
];

export const qualityOptions: { label: string; value: AudioQuality }[] = [
	{ label: "Original", value: "original" },
	{ label: "Efficient", value: "efficient" },
];
