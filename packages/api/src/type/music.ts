import z4 from "zod/v4";

export const MusicSchema = z4.object({
  filename: z4.string(),
  uploadHashCheck: z4.string(), // md5 but s3 only support md5 for etag
  hash: z4.string(), // blake3, i heard that is fast
  album: z4.string(),
  albumArtist: z4.string(),
  rawArtist: z4.string(),
  artists: z4.array(z4.string()),
  title: z4.string(),
  year: z4.number(),
  duration: z4.number(),
  bitsPerSample: z4.number().optional(),
  sampleRate: z4.number().optional(),
  track: z4.object({
    no: z4.number(),
  }),
  disc: z4.object({
    no: z4.number(),
  }),
  format: z4.object({
    codec: z4.string(),
    container: z4.string(),
    lossless: z4.boolean(),
  }),
  picture: z4
    .array(
      z4.object({
        format: z4.string(),
        data: z4.string(),
      })
    )
    .optional(),
  isInstrumental: z4.boolean().optional(),
});

export const DiscSchema = z4.object({
  no: z4.number(),
  musics: z4.array(MusicSchema),
});

export const AlbumsAlbumTypeEnum = z4.enum([
  "Album",
  "Single",
  "Compilation",
  "Soundtrack",
  "Live",
  "Remix",
  "Other",
]);

export const AlbumSchema = z4.object({
  hash: z4.string(),
  name: z4.string(),
  albumArtist: z4.string(),
  NoOfDiscs: z4.number(),
  NoOfTracks: z4.number(),
  albumType: AlbumsAlbumTypeEnum,
  disc: z4.array(DiscSchema),
});

export type Album = z4.infer<typeof AlbumSchema>;
export type Music = z4.infer<typeof MusicSchema>;
export type Disc = z4.infer<typeof DiscSchema>;
export type AlbumsAlbumType = z4.infer<typeof AlbumsAlbumTypeEnum>;
