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
