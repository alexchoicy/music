import { z } from "zod/v4";
import { AlbumSchema } from "../type/music.js";

export const uploadInitResponseSchema = z.object({
  uploadUrl: z.url(),
  error: z.string().optional(),
});

export const uploadMusicInitItemSchema = uploadInitResponseSchema.extend({
  trackHash: z.string().min(1),
  storedTrackID: z.string().min(1),
});

export type UploadMusicInitResponse = z.infer<typeof uploadMusicInitItemSchema>;

export const UploadMusicInitSchema = z.array(AlbumSchema);
