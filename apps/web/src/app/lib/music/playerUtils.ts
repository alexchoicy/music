import type { AlbumDetailResponse } from "@music/api/dto/album.dto";
import type { AudioPlayerList } from "~/stores/audioPlayer";
import type { Playlist } from "~/types/playlist";

export function parsePlayerPlayListFromPlaylist(
  playlist: Playlist
): AudioPlayerList[] {
  return playlist.tracks.map((track) => ({
    trackid: track.id,
    playlistRef: playlist.playListRef,
  }));
}

export function parsePlaylistFromAlbumDetail(
  albumDetail: AlbumDetailResponse,
  directlyPlay = false,
  ignoreInstrumental = true,
  ignoreMC = true
): Playlist {
  const refKey = `${albumDetail.id}-${Date.now()}`;
  const tracks = albumDetail.Disc.map((d) => d.tracks)
    .flat()
    .filter((t) => {
      if (directlyPlay) return true;
      if (ignoreInstrumental && t.isInstrumental) return false;
      if (ignoreMC && t.isMC) return false;
      return true;
    })
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
        sampleRate: q.sampleRate,
        islossless: q.islossless,
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
