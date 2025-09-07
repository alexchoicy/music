import z4 from "zod/v4";

export const uploadInitResponseSchema = z4.object({
    uploadUrl: z4.url(),
})