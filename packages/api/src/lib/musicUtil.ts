import path from "path";

export function getMusicExt(fileContainer: string, fileCodec: string) {
  switch (fileContainer) {
    case "flac":
      return ".flac";
  }

  if (fileContainer.includes("mpeg")) {
    if (fileCodec.includes("layer 3")) {
      return ".mp3";
    }
  }
}

export function getMusicStorePath(hash: string) {
  const firstSubPath = hash.slice(0, 2);
  const secondSubPath = hash.slice(2, 4);
  return path.join(firstSubPath, secondSubPath);
}
