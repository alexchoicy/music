import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

type ConcertPlayerState = {
	autoplay: boolean;
	ambientLight: boolean;
	captionsOn: boolean;
};

type ConcertPlayerAction = {
	setAutoplay: (autoplay: boolean) => void;
	setAmbientLight: (ambientLight: boolean) => void;
	setCaptionsOn: (captionsOn: boolean) => void;
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
				setAutoplay: (autoplay) => set({ autoplay }),
				setAmbientLight: (ambientLight) => set({ ambientLight }),
				setCaptionsOn: (captionsOn) => set({ captionsOn }),
			}),
			{
				name: "concert-player-settings",
				storage: createJSONStorage(() => localStorage),
			},
		),
	),
);
