import { defineStore } from "pinia";

export const useAudioPlayerStore = defineStore("audioPlayer", {
  state: () => ({
    playing: false,
  }),
  actions: {
    setPlaying(p: boolean) {
      this.playing = p;
    },
  },
});
