import { AlbumsAlbumTypeEnum } from "../type/music.js";
import { z } from "zod/v4";

export const AttachmentType = z.enum(["coverImage"]);

export const TrackQualityOptions = z.enum(["original", "transcoded"]);

export const ArtistsArtistType = z.enum(["person", "group", "project"]);

export const Attachment = z.object({
  url: z.url(),
  id: z.string(),
  entityType: AttachmentType,
  fileType: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const Artist = z.object({
  id: z.string(),
  name: z.string(),
  language: z.object().nullable(),
  image: z.url().nullable(),
  artistType: ArtistsArtistType,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TrackQuality = z.object({
  type: TrackQualityOptions,
  url: z.url(),
  fileCodec: z.string(),
  fileContainer: z.string(),
  bitrate: z.number(),
  sampleRate: z.number(),
  islossless: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const Track = z.object({
  id: z.string(),
  index: z.number(),
  trackNo: z.number(),

  name: z.string(),
  durationMs: z.number(),
  isInstrumental: z.boolean(),
  language: z.object().nullable(),
  musicBrainzId: z.string().nullable(),
  quality: z.array(TrackQuality),

  artists: z.array(Artist),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export const Disc = z.object({
  discNo: z.number(),
  tracks: z.array(Track),
});

export const AlbumDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number(),
  language: z.object().nullable(),
  totalDurationMs: z.number(),
  mainArtist: Artist,
  artists: z.array(Artist),
  albumType: AlbumsAlbumTypeEnum,
  musicbrainzId: z.string().nullable(),
  cover: z.url().nullable(),
  hasInstrumental: z.boolean(),
  totalTracks: z.number(),

  Disc: z.array(Disc),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AlbumResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number(),
  language: z.object().nullable(),
  albumType: AlbumsAlbumTypeEnum,
  cover: z.url().nullable(),
  totalTracks: z.number(),
  hasInstrumental: z.boolean(),
  mainArtist: Artist,

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TrackSchema = z.infer<typeof Track>;

export type TrackQualityType = z.infer<typeof TrackQualityOptions>;

export type AlbumDetailResponse = z.infer<typeof AlbumDetailResponseSchema>;

export type ArtistType = z.infer<typeof ArtistsArtistType>;

export type ArtistSchema = z.infer<typeof Artist>;

export type AlbumResponse = z.infer<typeof AlbumResponseSchema>;

export const ArtistInfoSchema = Artist.extend({
  albums: z
    .object({
      id: z.string(),
      name: z.string(),
      year: z.number(),
      language: z.object().nullable(),
      albumType: AlbumsAlbumTypeEnum,
      cover: z.url().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .array(),
});

export type ArtistInfo = z.infer<typeof ArtistInfoSchema>;
