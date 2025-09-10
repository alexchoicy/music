import { AlbumSchema } from "../type/music.js";
import { z } from "zod/v4";
import { uploadInitResponseSchema } from "./upload.dto.js";

export const UploadMusicInitSchema = z.array(AlbumSchema);

export const uploadMusicInitItemSchema = uploadInitResponseSchema.extend({
  trackHash: z.string().min(1),
  storedTrackID: z.string().min(1),
});

export type UploadMusicInitResponse = z.infer<typeof uploadMusicInitItemSchema>;
