import { z } from "zod/v4";
import { AlbumResponseSchema, ArtistsArtistType } from "./album.dto.js";

export const subArtist = z.object({
  id: z.string(),
  name: z.string(),
  image: z.url().nullable(),
  artistType: ArtistsArtistType,
});

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.url().nullable(),
  artistType: ArtistsArtistType,
  albums: z.array(AlbumResponseSchema),
  groupMembers: z.array(subArtist).nullable(),
});

export type SubArtist = z.infer<typeof subArtist>;

export type Artist = z.infer<typeof artistSchema>;

export const ArtistRelationshipSchema = z.object({
  artists: z.array(z.number()),
});
