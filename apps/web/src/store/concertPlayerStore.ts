import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

type ConcertPlayerState = {
	autoplay: boolean;
	ambientLight: boolean;
	captionsOn: boolean;
	volume: number;
};

type ConcertPlayerAction = {
	setAutoplay: (autoplay: boolean) => void;
	setAmbientLight: (ambientLight: boolean) => void;
	setCaptionsOn: (captionsOn: boolean) => void;
	setVolume: (volume: number) => void;
};

export const useConcertPlayerStore = create<
	ConcertPlayerState & ConcertPlayerAction
>()(
	devtools(
		persist(
			(set) => ({
				autoplay: true,
				ambientLight: true,
				captionsOn: false,
				volume: 1,
				setAutoplay: (autoplay) => set({ autoplay }),
				setAmbientLight: (ambientLight) => set({ ambientLight }),
				setCaptionsOn: (captionsOn) => set({ captionsOn }),
				setVolume: (volume) =>
					set({ volume: Math.min(Math.max(volume, 0), 1) }),
			}),
			{
				name: "concert-player-settings",
				storage: createJSONStorage(() => localStorage),
			},
		),
	),
);
