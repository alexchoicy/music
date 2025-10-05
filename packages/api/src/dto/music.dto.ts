import { AlbumSchema } from "../type/music.js";
import { z } from "zod/v4";

export const UploadMusicInitSchema = z.array(AlbumSchema);
