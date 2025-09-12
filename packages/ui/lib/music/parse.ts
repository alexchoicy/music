import { type AlbumDetailResponse } from "@music/api/dto/album.dto";
import type { AudioPlayerList } from "../../stores/audioPlayer";
import type { Playlist } from "../../types/playlist";

export function parsePlaylistFromAlbumDetail(albumDetail: AlbumDetailResponse) {
  const refKey = `${albumDetail.id}-${Date.now()}`;
  const tracks = albumDetail.Disc.map((d) => d.tracks)
    .flat()
    .map((t) => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      durationMs: t.durationMs,
      album: {
        id: albumDetail.id,
        name: albumDetail.name,
        cover: albumDetail.cover,
      },
      quality: t.quality.map((q) => ({
        type: q.type,
        url: q.url,
        fileCodec: q.fileCodec,
        fileContainer: q.fileContainer,
        bitrate: q.bitrate,
        sampleRate: q.sampleRate ?? 0, // default or from q
        islossless: q.islossless ?? false, // default or from q
      })),
    }));

  const pl: Playlist = {
    playListRef: refKey,
    name: albumDetail.name,
    playlistURL: "",
    trackCount: tracks.length,
    durationMs: albumDetail.totalDurationMs,
    type: "album",
    tracks: tracks,
  };

  return pl;
}

export function parsePlayerPlayListFromAlbumDetail(
  albumDetail: Playlist
): AudioPlayerList[] {
  return albumDetail.tracks.map((track) => ({
    trackid: track.id,
    playlistRef: albumDetail.playListRef,
  }));
}
