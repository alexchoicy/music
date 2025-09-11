import type { TrackQualityType } from "@music/api/dto/album.dto"
import { defineStore } from "pinia";
import { RepeatMode, type Playlist } from "~/types/playlist";

interface AudioPlayerList {
  playlistRef: string;
  trackid: string;
}

export const useAudioPlayerStore = defineStore("audioPlayer", {
  state: () => ({
    playing: false,
    queue: [] as AudioPlayerList[],
    cursor: 0,
    volume: 1,
    muted: false,
    repeat: RepeatMode.Off,
    shuffle: false,
    currentTime: 0,
    preferredQuality: 'original' as TrackQualityType,
  }),
  getters: {
    currentItem: (s) => s.queue[s.cursor] || null,
    hasNext: (s) => s.cursor + 1 < s.queue.length,
    hasPrev: (s) => s.cursor > 0,
    currentTrack(state) {
      const entity = useAudioEntity();
      if (!entity.playList) return null;
      const current = state.queue[state.cursor];
      return entity.playList.find(list => list.playListRef === current?.playlistRef)?.tracks.find(track => track.id === current?.trackid) || null;
    }
  },
  actions: {
    setPlayList(list: AudioPlayerList[]) {
      this.queue.push(...list);
    },
    setPlaying(p: boolean) {
      this.playing = p;
    },
    next() {
      if (this.hasNext) this.cursor += 1;
      else this.setPlaying(false);
    },
    prev() {
      if (this.hasPrev) this.cursor -= 1;
    },
  },
});


export const useAudioEntity = defineStore("audioEntity", {
  state: () => ({
    playList: shallowRef<Playlist[]>([]),
  }),
  actions: {
    upsert(pl: Playlist) {
      this.playList.push(pl);
    },
    clear() {
      this.playList = [];
    }
  }
});