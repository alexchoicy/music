import type { TrackQualityType } from "@music/api/dto/album.dto";
import { defineStore } from "pinia";
import {
  RepeatMode,
  type PlayableTrack,
  type Playlist,
} from "../types/playlist";
import { shallowRef } from "vue";
import { parsePlayerPlayListFromAlbumDetail } from "@/lib/music/parse";

export interface AudioPlayerList {
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
    preferredQuality: "original" as TrackQualityType,
  }),
  getters: {
    hasQueue: (s) => s.queue.length > 0,
    currentItem: (s) => s.queue[s.cursor] || null,
    hasNext: (s) => s.cursor + 1 < s.queue.length,
    hasPrev: (s) => s.cursor > 0,
    currentTrack(state): PlayableTrack | null {
      const entity = useAudioEntity();
      if (!entity.playList) return null;
      const current = state.queue[state.cursor];
      return (
        entity.playList
          .find((list) => list.playListRef === current?.playlistRef)
          ?.tracks.find((track) => track.id === current?.trackid) || null
      );
    },
    currentQuality(state) {
      const track = useAudioPlayerStore().currentTrack;
      if (!track) return null;
      return (
        track.quality.find((q) => q.type === state.preferredQuality) || null
      );
    },
  },
  actions: {
    stopPlaying() {
      this.playing = false;
    },
    setPlayList(list: AudioPlayerList[]) {
      this.queue.push(...list);
    },
    setPlaying() {
      if (this.queue.length === 0) return;
      this.playing = !this.playing;
    },
    setPlayIndex(i: number) {
      if (i < 0 || i >= this.queue.length) return;
      this.cursor = i;
      this.currentTime = 0;
    },
    setCurrentTime(t: number) {
      this.currentTime = t;
    },
    next() {
      if (this.hasNext) this.cursor += 1;
      else this.playing = false;
    },
    prev() {
      if (this.hasPrev) this.cursor -= 1;
    },
    clear() {
      this.playing = false;
      this.queue = [];
      this.cursor = 0;
      this.currentTime = 0;

      const entity = useAudioEntity();
      entity.clear();
    },
    playWithList(playList: Playlist) {
      this.clear();

      const entity = useAudioEntity();
      entity.upsert(playList);

      this.setPlayList(parsePlayerPlayListFromAlbumDetail(playList));
      this.playing = true;
    },
    playWithListAndIndex(playList: Playlist, index: number) {
      this.clear();

      const entity = useAudioEntity();
      entity.upsert(playList);

      this.setPlayList(parsePlayerPlayListFromAlbumDetail(playList));
      this.setPlayIndex(index);
      this.playing = true;
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
    },
  },
});
