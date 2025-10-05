import { z } from "zod/v4";

export const MusicSchema = z.object({
  filename: z.string(),
  uploadHashCheck: z.string(), // md5, b2 s3 only support md5 for verify
  hash: z.string(), // blake3, i heard that is fast
  album: z.string(),
  albumArtist: z.string(),
  rawArtist: z.string(),
  artists: z.array(z.string()),
  title: z.string(),
  year: z.number(),
  duration: z.number(),
  bitsPerSample: z.number().optional(),
  sampleRate: z.number().optional(),
  track: z.object({
    no: z.number(),
  }),
  disc: z.object({
    no: z.number(),
  }),
  format: z.object({
    codec: z.string(),
    container: z.string(),
    lossless: z.boolean(),
  }),
  picture: z
    .array(
      z.object({
        format: z.string(),
        data: z.string(),
      })
    )
    .optional(),
  isInstrumental: z.boolean().optional(),
});

export const DiscSchema = z.object({
  no: z.number(),
  musics: z.array(MusicSchema),
});

export const AlbumsAlbumTypeEnum = z.enum([
  "Album",
  "Single",
  "Compilation",
  "Soundtrack",
  "Live",
  "Remix",
  "Other",
]);

export const AlbumSchema = z.object({
  hash: z.string(),
  name: z.string(),
  albumArtist: z.string(),
  NoOfDiscs: z.number(),
  NoOfTracks: z.number(),
  albumType: AlbumsAlbumTypeEnum,
  disc: z.array(DiscSchema),
});

export type Album = z.infer<typeof AlbumSchema>;
export type Music = z.infer<typeof MusicSchema>;
export type Disc = z.infer<typeof DiscSchema>;
export type AlbumsAlbumType = z.infer<typeof AlbumsAlbumTypeEnum>;
