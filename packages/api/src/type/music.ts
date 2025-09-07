import z4 from "zod/v4";

export const MusicSchema = z4.object({
  filename: z4.string(),
  hash: z4.string(),
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
