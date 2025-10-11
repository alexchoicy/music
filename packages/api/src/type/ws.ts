import { z } from "zod/v4";

//i don't know what the others is
export const WSMessageType = ["music", "ping", "others"] as const;

export const WSMusicAction = ["play", "pause", "change", "changeTime"] as const;

export const WSMusicMessageClientPayloadSchema = z.object({
  action: z.enum(WSMusicAction),
  positionMs: z.number().min(0),
  trackID: z.string().optional(),
});

export const WSMusicMessageServerPayloadSchema = z.object({
  action: z.enum(WSMusicAction),
  userID: z.string(),
  positionMs: z.number().min(0),
  trackID: z.string(),
  ServerTime: z.number().min(0),
});

export type WSMusicMessageClientPayloadType = z.infer<
  typeof WSMusicMessageClientPayloadSchema
>;
