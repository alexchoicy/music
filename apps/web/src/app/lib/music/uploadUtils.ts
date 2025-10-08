import type { UploadMusic, UploadDisc } from "@music/api/type/music";
import { createBLAKE3, createMD5 } from "hash-wasm";
import { type IAudioMetadata } from "music-metadata";
import { uint8ArrayToBase64 } from "uint8array-extras";

export async function getAlbumHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getBase64FromFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      } else {
        reject(new Error("FileReader result is not a string"));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function hashFileStream(file: File) {
  const hasher = await createBLAKE3();
  const reader = file.stream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hasher.update(value);
  }

  return hasher.digest("hex");
}

export async function hashFileStreamMd5(file: File) {
  const hasher = await createMD5();
  const reader = file.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hasher.update(value);
  }

  return hasher.digest("hex");
}

export function checkIfSoundtrack(title: string, filename: string): boolean {
  const soundtrackIndicators = [
    "soundtrack",
    "ost",
    "サウンドトラック",
    "オリジナル",
  ];
  const lowerTitle = title.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  return soundtrackIndicators.some(
    (indicator) =>
      lowerTitle.includes(indicator) || lowerFilename.includes(indicator)
  );
}

function checkIfInstrumental(title: string, filename: string): boolean {
  const instrumentalIndicators = ["instrumental", "karaoke", "Off Vocal"];
  const lowerTitle = title.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  return instrumentalIndicators.some(
    (indicator) =>
      lowerTitle.includes(indicator) || lowerFilename.includes(indicator)
  );
}

export function checkIfMC(title: string, filename: string): boolean {
  const mcIndicators = ["mc", "m.c.", "m.c", "ＭＣ"];
  const lowerTitle = title.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  return mcIndicators.some(
    (indicator) =>
      lowerTitle.includes(indicator) || lowerFilename.includes(indicator)
  );
}

export function checkIfUnsolvedFeat(artist: string[], title: string): boolean {
  const unsolvedFeatIndicators = ["feat", "featuring", "ft"];
  const lowerArtist = artist.map((a) => a.toLowerCase()).join(" ");
  const lowerTitle = title.toLowerCase();

  return unsolvedFeatIndicators.some(
    (indicator) =>
      lowerArtist.includes(indicator) || lowerTitle.includes(indicator)
  );
}

export function getNextFreeTrackNo(dics: UploadDisc, preferred: number) {
  if (preferred <= 0) {
    return dics.musics.length + 1;
  }
  const trackNos = new Set(dics.musics.map((m: UploadMusic) => m.track.no));
  if (trackNos.has(preferred)) {
    let nextNo = 1;
    while (trackNos.has(nextNo)) {
      nextNo++;
    }
    return nextNo;
  }

  return preferred;
}

export function checkIfVariousArtists(artist: string): boolean {
  const variousIndicators = ["various artists", "va"];
  const lowerArtist = artist.toLowerCase();
  return variousIndicators.some((indicator) => lowerArtist.includes(indicator));
}

export function covertToMusicObject(
  metadata: IAudioMetadata,
  hash: string,
  uploadHashCheck: string,
  filename: string
): UploadMusic {
  const artists = Array.from(
    new Set(metadata.common.artists ?? ["Unknown Artist"])
  );
  const picture =
    metadata.common.picture?.map((pic) => ({
      format: pic.format,
      data: uint8ArrayToBase64(pic.data),
    })) || [];

  return {
    hash: hash,
    uploadHashCheck,
    filename: filename,
    album: metadata.common.album || "Unknown Album",
    albumArtist: metadata.common.albumartist || "Unknown Album Artist",
    rawArtist: metadata.common.artist || "Unknown Artist",
    artists,
    title: metadata.common.title || filename,
    year: metadata.common.year || 0,
    duration: metadata.format.duration || 0,
    bitsPerSample: metadata.format.bitsPerSample || 0,
    sampleRate: metadata.format.sampleRate || 0,
    track: {
      no: metadata.common.track.no || 0,
    },
    disc: {
      no: metadata.common.disk.no || 0,
    },
    format: {
      codec: metadata.format.codec || "unknown",
      container: metadata.format.container || "unknown",
      lossless: metadata.format.lossless || false,
    },
    picture: picture,
    isInstrumental: checkIfInstrumental(metadata.common.title || "", filename),
    isMC: checkIfMC(metadata.common.title || "", filename),
  };
}
