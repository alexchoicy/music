import type { TrackQualityType } from "@music/api/dto/album.dto";
import { defineStore } from "pinia";
import { parsePlayerPlayListFromPlaylist } from "~/lib/music/playerUtils";
import type { AudioPlayerLocalStorage } from "~/types/audioPlayer";
import { RepeatMode, type Playlist } from "~/types/playlist";

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
  console.log("Setting audio player local storage", info);
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
    shuffle: false,
    currentTime: 0,
    preferredQuality: "original" as TrackQualityType,
    currentQuality: null as TrackQualityType | null,
  }),
  getters: {
    isPlaying: (state) => state.playing,
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
        track.quality.find((q) => q.islossless)?.url;

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
    stopPlaying() {
      this.playing = false;
    },
    togglePlay() {
      this.playing = !this.playing;
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
    next() {
      switch (this.repeat) {
        case RepeatMode.One:
          this.currentTime = 0;
          break;
        case RepeatMode.All:
          if (this.hasNext) {
            this.cursor++;
            this.currentTime = 0;
          } else {
            this.cursor = 0;
            this.currentTime = 0;
          }
          break;
        case RepeatMode.Off:
        default:
          if (this.hasNext) {
            this.cursor++;
            this.currentTime = 0;
          } else {
            this.playing = false;
          }
      }
    },
    manualNext() {
      if (this.hasNext) {
        this.cursor++;
        this.currentTime = 0;
      } else {
        this.playing = false;
      }
    },
    manualPrevious() {
      if (this.hasPrevious) {
        this.cursor--;
        this.currentTime = 0;
      } else {
        this.playing = false;
      }
    },
    clear() {
      this.playing = false;
      this.queue = [];
      this.cursor = 0;
      this.currentTime = 0;

      const audioEntity = useAudioEntity();
      audioEntity.clear();
    },
    playWithList(playlist: Playlist, clear = true) {
      if (clear) this.clear();

      const audioEntity = useAudioEntity();
      audioEntity.upsert(playlist);

      this.upsert(parsePlayerPlayListFromPlaylist(playlist));
      this.playing = true;
    },
    playWithListIndex(playlist: Playlist, index: number, clear = true) {
      if (clear) this.clear();

      const audioEntity = useAudioEntity();
      audioEntity.upsert(playlist);

      this.upsert(parsePlayerPlayListFromPlaylist(playlist));
      this.setPlayIndex(index);
      this.playing = true;
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

      this.$subscribe((mutation, state) => {
        setAudioPlayerLocalStorage({
          volume: state.volume,
          muted: state.muted,
          repeat: state.repeat,
        });
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
