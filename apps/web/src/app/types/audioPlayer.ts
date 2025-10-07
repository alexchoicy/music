import type { RepeatMode } from "./playlist";

export interface AudioPlayerLocalStorage {
  muted: boolean;
  volume: number;
  repeat: RepeatMode;
}
