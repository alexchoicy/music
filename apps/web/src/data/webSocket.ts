import { z } from "zod";

const playbackTrackSchema = z.strictObject({
	trackId: z.string(),
	albumId: z.string(),
	title: z.string(),
	albumTitle: z.string(),
	artists: z.array(z.string()),
	coverUrl: z.string().nullable().optional(),
	durationMs: z.number().int().min(0),
});

const playbackStateSchema = z.strictObject({
	status: z.enum(["idle", "loading", "ready", "playing", "paused"]),
	positionMs: z.number().int().min(0),
	track: playbackTrackSchema.nullable().optional(),
});

const deviceControlActionSchema = z.enum(["play", "pause"]);

const deviceSessionSchema = z.strictObject({
	sessionId: z.string(),
	state: playbackStateSchema.nullable().optional(),
	stateUpdatedAt: z.number(),
	activatedAt: z.number(),
	connectedAt: z.number(),
});

const deviceSchema = z.strictObject({
	deviceId: z.string(),
	name: z.string(),
	sessions: z.array(deviceSessionSchema),
});

// Player state moved between sessions. The server relays it without reading it.
export const transferSnapshotSchema = z.object({
	queue: z
		.array(
			z.looseObject({
				trackId: z.string(),
				albumId: z.string(),
				title: z.string(),
				durationInMs: z.number(),
				audio: z.looseObject({
					file: z.looseObject({
						original: z.looseObject({
							url: z.string(),
							extension: z.string(),
						}),
					}),
				}),
			}),
		)
		.min(1),
	index: z.number().int().min(0),
	positionMs: z.number().min(0),
	playing: z.boolean(),
});

export const webSocketServerMessageSchema = z.discriminatedUnion("type", [
	z.strictObject({
		type: z.literal("devices"),
		data: z.strictObject({
			devices: z.array(deviceSchema),
			discordDeviceId: z.string().nullable().optional(),
		}),
	}),
	z.strictObject({
		type: z.literal("control"),
		data: z.strictObject({ action: deviceControlActionSchema }),
	}),
	z.strictObject({
		type: z.literal("transferSnapshotRequest"),
		data: z.strictObject({ requestId: z.string(), deviceName: z.string() }),
	}),
	z.strictObject({
		type: z.literal("transferSnapshot"),
		data: z.strictObject({
			requestId: z.string(),
			snapshot: z.unknown(),
		}),
	}),
	z.strictObject({
		type: z.literal("transferRelease"),
		data: z.strictObject({ requestId: z.string() }),
	}),
	z.strictObject({
		type: z.literal("transferFailed"),
		data: z.strictObject({ requestId: z.string(), reason: z.string() }),
	}),
]);

export type PlaybackState = z.infer<typeof playbackStateSchema>;
export type DeviceControlAction = z.infer<typeof deviceControlActionSchema>;
export type PlaybackDevice = z.infer<typeof deviceSchema>;
export type PlaybackDeviceSession = z.infer<typeof deviceSessionSchema>;
export type TransferSnapshot = z.infer<typeof transferSnapshotSchema>;
export type WebSocketServerMessage = z.infer<
	typeof webSocketServerMessageSchema
>;

export type WebSocketClientMessage =
	| {
			type: "register";
			data: { deviceId: string; sessionId: string; name: string };
	  }
	| { type: "state"; data: PlaybackState }
	| {
			type: "control";
			data: {
				deviceId: string;
				sessionId: string;
				action: DeviceControlAction;
			};
	  }
	| { type: "discordDevice"; data: { deviceId: string | null } }
	| {
			type: "transfer";
			data: { requestId: string; deviceId: string; sessionId: string };
	  }
	| {
			type: "transferSnapshot";
			data: { requestId: string; snapshot: TransferSnapshot | null };
	  }
	| {
			type: "transferResult";
			data: { requestId: string; success: boolean };
	  };
