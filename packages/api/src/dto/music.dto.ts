import { AlbumSchema } from "../type/music.js";
import z4 from "zod";
import { uploadInitResponseSchema } from "./upload.dto.js";

export const UploadMusicInitSchema = z4.array(AlbumSchema);

export const uploadMusicInitItemSchema = uploadInitResponseSchema.extend({
  trackHash: z4.string().min(1),
  storedTrackID: z4.string().min(1),
});

export type UploadMusicInitResponse = z4.infer<
  typeof uploadMusicInitItemSchema
>;
