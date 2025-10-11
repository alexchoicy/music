import type { TrackQualityType } from "@music/api/dto/album.dto";
import { defineStore } from "pinia";
import { parsePlayerPlayListFromPlaylist } from "~/lib/music/playerUtils";
import type { AudioPlayerLocalStorage } from "~/types/audioPlayer";
import { RepeatMode, type Playlist } from "~/types/playlist";

import {
  type WSMusicMessageClientPayloadType,
  WSMusicAction,
} from "@music/api/type/ws";

export interface AudioPlayerList {
  playlistRef: string;
  trackid: string;
}

export const getAudioPlayerLocalStorage = (): AudioPlayerLocalStorage => {
  try {
    const storedPlayerInfo = localStorage.getItem("audioPlayer");
    if (!storedPlayerInfo) {
      return {
        muted: false,
        volume: 1,
        repeat: RepeatMode.Off,
      };
    }
    return JSON.parse(storedPlayerInfo) as AudioPlayerLocalStorage;
  } catch (e) {
    console.warn("Corrupted audioPlayer data in localStorage, resetting...");
    localStorage.removeItem("audioPlayer");
    return {
      muted: false,
      volume: 1,
      repeat: RepeatMode.Off,
    };
  }
};

export const setAudioPlayerLocalStorage = (
  info: Partial<AudioPlayerLocalStorage>
) => {
  const current = getAudioPlayerLocalStorage();
  const updated = { ...current, ...info };
  localStorage.setItem("audioPlayer", JSON.stringify(updated));
};

export const useAudioPlayer = defineStore("audioPlayer", {
  state: () => ({
    playing: false,
    queue: [] as AudioPlayerList[],
    cursor: 0,
    volume: 1,
    muted: false,
    repeat: RepeatMode.Off,
    isShuffling: false,
    shuffle: [] as number[],
    currentTime: 0,
    preferredQuality: "original" as TrackQualityType,
    currentQuality: null as TrackQualityType | null,
  }),
  getters: {
    hasQueue: (state) => state.queue.length > 0,
    currentItem: (state) => state.queue[state.cursor] || null,
    hasNext: (state) => state.cursor < state.queue.length - 1,
    hasPrevious: (state) => state.cursor > 0,
    currentTrack: (state) => {
      const entity = useAudioEntity();
      if (!entity.playList) return null;
      const current = state.queue[state.cursor];
      const pl = entity.playList.find(
        (p) => p.playListRef === current?.playlistRef
      );
      return pl?.tracks.find((t) => t.id === current?.trackid) || null;
    },
    getPlayUrl: (state) => {
      const track = useAudioPlayer().currentTrack;
      if (!track) return "";

      const quality = state.currentQuality || state.preferredQuality;

      const url =
        track.quality.find((q) => q.type === quality)?.url ||
        track.quality.find((q) => q.islossless)?.url ||
        track.quality[0]?.url;

      if (!url) {
        console.warn("No URL found for current track");
        return "";
      }
      return url + "/stream";
    },
    getAlbumPath: (state) => {
      const track = useAudioPlayer().currentTrack;
      if (!track) return "";
      return `/music/albums/${track?.album.id}`;
    },
  },
  actions: {
    sendWs(action: (typeof WSMusicAction)[number]) {
      const ws = useWs();
      const playload: WSMusicMessageClientPayloadType = {
        action,
        positionMs: this.currentTime,
        trackID: this.currentTrack?.id,
      };
      ws.send(JSON.stringify({ event: "music", data: playload }));
    },
    stopPlaying() {
      this.playing = false;
    },
    togglePlay() {
      if (!this.currentTrack) return;
      this.playing = !this.playing;

      this.sendWs(this.playing ? "play" : "pause");
    },
    upsert(list: AudioPlayerList[]) {
      this.queue.push(...list);
    },
    setPlayIndex(index: number) {
      if (index < 0 || index >= this.queue.length) return;
      this.cursor = index;
      this.currentTime = 0;
    },
    setCurrentTime(time: number) {
      this.currentTime = time;
    },
    manualSetCurrentTime(time: number) {
      this.currentTime = time;
      this.sendWs("changeTime");
    },
    setVolume(volume: number) {
      this.volume = volume;
      if (this.muted && volume > 0) {
        this.muted = false;
      }
      setAudioPlayerLocalStorage({ volume: this.volume, muted: this.muted });
    },
    toggleRepeat() {
      if (this.repeat === RepeatMode.Off) {
        this.repeat = RepeatMode.All;
      } else if (this.repeat === RepeatMode.All) {
        this.repeat = RepeatMode.One;
      } else {
        this.repeat = RepeatMode.Off;
      }
      setAudioPlayerLocalStorage({ repeat: this.repeat });
    },
    toggleMute() {
      this.muted = !this.muted;
      setAudioPlayerLocalStorage({ muted: this.muted });
    },
    toggleShuffle() {
      this.isShuffling = !this.isShuffling;
      if (this.isShuffling) {
        this.shuffle = [];
        this.makeShuffle();
      } else {
        this.shuffle = [];
      }
    },
    makeShuffle() {
      this.shuffle = this.queue.map((_, i) => i);
      this.shuffle = this.shuffle.sort(() => Math.random() - 0.5);
    },
    shufflePlay() {
      if (this.shuffle.length === 0) this.makeShuffle();
      this.cursor = this.shuffle[0] || 0;
      this.currentTime = 0;
      this.shuffle = this.shuffle.slice(1);
    },
    next() {
      switch (this.repeat) {
        case RepeatMode.One:
          this.currentTime = 0;
          break;
        case RepeatMode.All:
          if (!this.hasNext) {
            this.cursor = 0;
            this.currentTime = 0;
            break;
          }
        case RepeatMode.Off:
        default:
          if (this.isShuffling) {
            this.shufflePlay();
          } else if (this.hasNext) {
            this.cursor++;
            this.currentTime = 0;
          } else {
            this.playing = false;
          }
      }
      this.sendWs("change");
    },
    manualNext() {
      if (this.isShuffling) {
        this.shufflePlay();
        this.sendWs("change");
        return;
      }
      if (this.hasNext) {
        this.cursor++;
        this.currentTime = 0;
      } else {
        this.playing = false;
      }

      this.sendWs("change");
    },
    manualPrevious() {
      if (this.isShuffling) {
        this.shufflePlay();
        return;
      }
      if (this.hasPrevious) {
        this.cursor--;
        this.currentTime = 0;
      } else {
        this.playing = false;
      }
      this.sendWs("change");
    },
    clear() {
      this.playing = false;
      this.queue = [];
      this.cursor = 0;
      this.currentTime = 0;
      this.shuffle = [];

      const audioEntity = useAudioEntity();
      audioEntity.clear();
    },
    playWithList(playlist: Playlist, clear = true) {
      if (clear) this.clear();

      const audioEntity = useAudioEntity();
      audioEntity.upsert(playlist);

      this.upsert(parsePlayerPlayListFromPlaylist(playlist));
      this.playing = true;
      this.sendWs("play");
    },
    playWithListIndex(playlist: Playlist, index: number, clear = true) {
      if (clear) this.clear();

      const audioEntity = useAudioEntity();
      audioEntity.upsert(playlist);

      this.upsert(parsePlayerPlayListFromPlaylist(playlist));
      this.setPlayIndex(index);
      this.playing = true;
      this.sendWs("play");
    },
    initFromLocalStorage() {
      if (typeof window === "undefined") return;

      const data = getAudioPlayerLocalStorage();
      this.volume = data.volume;
      this.muted = data.muted;
      this.repeat = data.repeat;
    },
    subscribeLocalStorage() {
      if (typeof window === "undefined") return;

      let last = {
        volume: this.volume,
        muted: this.muted,
        repeat: this.repeat,
      };

      this.$subscribe((mutation, state) => {
        const { volume, muted, repeat } = state;
        if (
          volume === last.volume &&
          muted === last.muted &&
          repeat === last.repeat
        ) {
          return;
        }
        last = { volume, muted, repeat };
        setAudioPlayerLocalStorage({ volume, muted, repeat });
      });
    },
  },
});

export const useAudioEntity = defineStore("audioEntity", {
  state: () => ({
    playList: [] as Playlist[],
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
