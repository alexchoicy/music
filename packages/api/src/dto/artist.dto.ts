import { z } from "zod/v4";
import { AlbumResponseSchema, Artist, ArtistInfoSchema } from "./album.dto.js";

import { ArtistsArtistType } from "../type/music.js";

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.url().nullable(),
  artistType: ArtistsArtistType,
  albums: z.array(AlbumResponseSchema),
  featuredIn: z.array(AlbumResponseSchema).nullable(),
  groupMembers: z.array(ArtistInfoSchema).nullable(),
  relatedGroups: z.array(ArtistInfoSchema).nullable(),
});

export type Artist = z.infer<typeof artistSchema>;

export const ArtistRelationshipSchema = z.object({
  artists: z.array(z.number()),
});
