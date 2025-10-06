import { z } from "zod/v4";
import { AlbumResponseSchema, Artist, ArtistsArtistType } from "./album.dto.js";

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.url().nullable(),
  artistType: ArtistsArtistType,
  albums: z.array(AlbumResponseSchema),
  groupMembers: z.array(Artist).nullable(),
});

export type Artist = z.infer<typeof artistSchema>;

export const ArtistRelationshipSchema = z.object({
  artists: z.array(z.number()),
});
