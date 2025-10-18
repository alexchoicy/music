import type { TrackQualityType } from "@music/api/dto/album.dto";
import type { RepeatMode } from "./playlist";

export interface AudioPlayerLocalStorage {
  muted: boolean;
  volume: number;
  repeat: RepeatMode;
  quality: TrackQualityType;
}
