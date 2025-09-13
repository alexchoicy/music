import { z } from "zod/v4";

export const uploadInitResponseSchema = z.object({
  uploadUrl: z.url(),
  error: z.string().optional(),
});
