import type { TrackQualityType, ArtistSchema } from "@music/api/dto/album.dto";

export enum RepeatMode {
  Off = "off",
  One = "one",
  All = "all",
}

export interface Playlist {
  playListRef: string;
  playlistURL: string;
  type: "album" | "custom";
  name: string;
  trackCount: number;
  durationMs: number;
  tracks: PlayableTrack[];
}

export interface PlayableTrack {
  id: string;
  name: string;
  album: { id: string; name: string; cover: string | null };
  durationMs: number;
  artists: ArtistSchema[];
  quality: {
    type: TrackQualityType;
    url: string;
    fileCodec: string;
    fileContainer: string;
    bitrate: number;
    sampleRate: number;
    islossless: boolean;
  }[];
}
