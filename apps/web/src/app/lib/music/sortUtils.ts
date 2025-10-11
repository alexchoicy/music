import type {
  UploadAlbum,
  UploadMusic,
  UploadDisc,
} from "@music/api/type/music";
import {
  checkIfSoundtrack,
  getAlbumHash,
  getNextFreeTrackNo,
} from "./uploadUtils";

export function albumMusicSorter(a: UploadMusic, b: UploadMusic) {
  return a.disc.no - b.disc.no || a.track.no - b.track.no;
}

export async function flattenAlbums(albums: UploadAlbum[]) {
  const allMusics: UploadMusic[] = [];
  for (const alb of albums) {
    for (const d of alb.disc) {
      for (const m of d.musics) {
        allMusics.push(m);
      }
    }
  }
  return allMusics;
}

// this is bad any smarter people
export async function albumMapper(albums: UploadMusic[]) {
  const albumMap = new Map<string, UploadAlbum>();
  for (const music of albums) {
    const albumHash = await getAlbumHash(music.album + music.albumArtist);
    if (!albumMap.has(albumHash)) {
      albumMap.set(albumHash, {
        hash: albumHash,
        name: music.album,
        albumArtist: music.albumArtist,
        NoOfDiscs: 0,
        NoOfTracks: 0,
        disc: [],
        albumType: "Album",
        artistsType: "person",
      });
    }
    const album = albumMap.get(albumHash)!;

    const tempDiscNo = music.disc.no === 0 ? 1 : music.disc.no;

    let disc = album.disc.find((d: UploadDisc) => d.no === tempDiscNo);

    if (!disc) {
      disc = {
        no: tempDiscNo,
        musics: [],
      };
      album.disc.push(disc);
      album.NoOfDiscs++;
    }
    music.track.no = getNextFreeTrackNo(disc, music.track.no);
    music.disc = { no: tempDiscNo };
    disc.musics.push(music);
    if (!music.isInstrumental) {
      album.NoOfTracks += 1;
    }
  }
  return albumMap;
}

export async function albumsSorter(allMusics: UploadMusic[]) {
  const albumMap = await albumMapper(allMusics);
  let hasAlbumArtistDetected = false;
  const sortedAlbums = Array.from(albumMap.values());

  for (const sortedAlbum of sortedAlbums) {
    if (sortedAlbum.albumArtist === "Unknown Album Artist") {
      const artistCount: Record<string, number> = {};
      sortedAlbum.disc.forEach((disc: UploadDisc) => {
        disc.musics.forEach((music: UploadMusic) => {
          music.artists.forEach((artist: string) => {
            artistCount[artist] = (artistCount[artist] || 0) + 1;
          });
        });
      });
      const mostFrequentArtist = Object.entries(artistCount).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      if (mostFrequentArtist) {
        hasAlbumArtistDetected = true;
        sortedAlbum.albumArtist = mostFrequentArtist;
        sortedAlbum.disc.forEach((disc: UploadDisc) => {
          disc.musics.forEach((music: UploadMusic) => {
            music.albumArtist = sortedAlbum.albumArtist;
          });
        });
        const newAlbumHash = await getAlbumHash(
          sortedAlbum.name + sortedAlbum.albumArtist
        );
        sortedAlbum.hash = newAlbumHash;
      }
    }

    if (checkIfSoundtrack(sortedAlbum.name, "")) {
      sortedAlbum.albumType = "Soundtrack";
    } else if (sortedAlbum.NoOfTracks < 2) {
      //haha this is weird as fuck
      sortedAlbum.albumType = "Single";
    } else {
      sortedAlbum.albumType = "Album";
    }

    sortedAlbum.disc.sort((a: UploadDisc, b: UploadDisc) => a.no - b.no);
    sortedAlbum.disc.forEach((disc: UploadDisc) =>
      disc.musics.sort(albumMusicSorter)
    );
  }
  if (hasAlbumArtistDetected) {
    return albumMapper(
      sortedAlbums.flatMap((a) => a.disc.flatMap((d) => d.musics))
    ).then((map) => Array.from(map.values()));
  } else {
    return sortedAlbums;
  }
}
