import { z } from "zod";

const playbackDataSchema = z.strictObject({
	action: z.enum(["play", "pause", "change", "changeTime", "end"]),
	positionMs: z.number().int().min(0),
	trackID: z.string().optional(),
});

export const musicWebSocketMessageSchema = z.strictObject({
	type: z.literal("music"),
	data: playbackDataSchema,
});

export const concertWebSocketMessageSchema = z.strictObject({
	type: z.literal("concert"),
	data: playbackDataSchema,
});

export const eventsWebSocketMessageSchema = z.strictObject({
	type: z.literal("events"),
	data: z.strictObject({}),
});

export const webSocketMessageSchema = z.discriminatedUnion("type", [
	musicWebSocketMessageSchema,
	concertWebSocketMessageSchema,
	eventsWebSocketMessageSchema,
]);

export type MusicWebSocketMessage = z.infer<typeof musicWebSocketMessageSchema>;
export type ConcertWebSocketMessage = z.infer<
	typeof concertWebSocketMessageSchema
>;
export type EventsWebSocketMessage = z.infer<
	typeof eventsWebSocketMessageSchema
>;
export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;
