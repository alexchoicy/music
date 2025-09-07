import { AlbumSchema } from "../type/music.js";
import z4 from "zod";
import { uploadInitResponseSchema } from "./upload.dto.js";

export const UploadMusicInitSchema = z4.array(AlbumSchema);

export const UploadMusicInitResponseSchema = z4.array(uploadInitResponseSchema.and(
    z4.object({
        trackHash: z4.string().min(1),
        storedTrackID: z4.string().min(1),
    })
));
