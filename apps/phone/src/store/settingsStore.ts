import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

/** `original` is the uploaded file (e.g. FLAC); `efficient` is 96 kbps Opus when available. */
export type AudioQuality = "original" | "efficient";

type Settings = {
	streamingQuality: AudioQuality;
	downloadQuality: AudioQuality;
	/** Saves played tracks for offline; on Wi‑Fi they stream and save as originals. */
	savePlayedTracks: boolean;
};

type SettingsState = Settings & {
	update: (settings: Partial<Settings>) => void;
};

const storageKey = "settings";

const defaults: Settings = {
	streamingQuality: "efficient",
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
		const value: Settings = {
			streamingQuality,
			downloadQuality,
			savePlayedTracks,
		};
		Storage.setItemSync(storageKey, JSON.stringify(value));
	},
}));
