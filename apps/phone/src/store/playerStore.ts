import { create } from "zustand";

type PlayerState = {
	isPlaying: boolean;
	togglePlayback: () => void;
};

export const usePlayerStore = create<PlayerState>()((set) => ({
	isPlaying: false,
	togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
