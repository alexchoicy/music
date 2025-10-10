import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	WsException,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import WebSocket, { type Server } from 'ws';
import { WSMusicMessageClientPayloadSchema } from '@music/api/type/ws';

//it meaning the socket of each user
interface ClientRoom {
	leader: WebSocket;
	members: Set<WebSocket>; // socket ids
}

@WebSocketGateway({
	path: '/events',
})
export class wsEventsGateway
	implements OnGatewayConnection, OnGatewayDisconnect
{
	constructor(private readonly jwksProvider: JWKSProvider) {}

	private clientRoom = new Map<string, ClientRoom>();

	private machineRoom = new Map<string, WebSocket>();

	private heartbeatInterval?: NodeJS.Timeout;

	@WebSocketServer() server: Server;

	private parseCookieAuth(cookieHeader?: string): string {
		if (!cookieHeader) return '';
		const parts = cookieHeader.split(';');
		for (const c of parts) {
			const [rawName, ...rawVal] = c.split('=');
			if (!rawName) return '';
			const name = rawName.trim();
			if (name === 'music_auth_token') {
				const value = rawVal.join('=').trim();
				return value;
			}
		}
		return '';
	}

	private getToken(message: IncomingMessage): string {
		if (message.headers.authorization?.startsWith('Bearer ')) {
			return message.headers.authorization.substring(7);
		}
		return this.parseCookieAuth(message.headers.cookie);
	}

	private getHeartbeat() {
		if (this.heartbeatInterval) return;

		const bindLiveness = (ws: WebSocket) => {
			ws.isAlive = true;
			ws.on('pong', () => {
				ws.isAlive = true;
			});
		};

		this.server?.clients?.forEach(bindLiveness);
		this.server?.on('connection', bindLiveness);
		this.heartbeatInterval = setInterval(() => {
			this.clientRoom.forEach((room) => {
				room.members.forEach((client) => {
					if (client.readyState !== WebSocket.OPEN) {
						client.terminate();
						return;
					}

					if (!client.isAlive) {
						client.terminate();
						return;
					}

					try {
						client.isAlive = false;
						client.ping();
					} catch {
						client.terminate();
					}
				});
			});
			this.machineRoom.forEach((client) => {
				if (client.readyState !== WebSocket.OPEN) {
					client.terminate();
					return;
				}

				if (!client.isAlive) {
					client.terminate();
					return;
				}

				try {
					client.isAlive = false;
					client.ping();
				} catch {
					client.terminate();
				}
			});
		}, 30000);

		this.server?.on?.('close', () => clearInterval(this.heartbeatInterval));
	}

	async handleConnection(client: WebSocket, message: IncomingMessage) {
		const token = this.getToken(message);
		if (!token) {
			client.close(4401, 'No token');
			return;
		}

		try {
			const valid = await this.jwksProvider.verifyToken(token);
			client.user = {
				type: valid.payload.type,
				info: {
					uid: valid.payload.info.uid,
					role: valid.payload.info.role,
				},
			};

			this.getHeartbeat();

			if (client.user.type === 'access') {
				const uid = client.user.info.uid;
				const room = this.clientRoom.get(uid);
				if (room) {
					room.members.add(client);
					room.leader = client;
				} else {
					this.clientRoom.set(uid, {
						leader: client,
						members: new Set([client]),
					});
				}
			} else if (client.user.type === 'machine') {
				const uid = client.user.info.uid;

				client.once('close', () => {
					const current = this.machineRoom.get(uid);
					if (current === client) this.machineRoom.delete(uid);
				});

				const existing = this.machineRoom.get(uid);

				if (existing && existing !== client) {
					existing.terminate();
				}
				this.machineRoom.set(uid, client);
			}
		} catch {
			console.log('Token verification failed');
			client.close(4403, 'Invalid token');
		}
	}

	handleDisconnect(client: WebSocket) {
		if (!client.user) return;
		try {
			if (client.user.type === 'machine') {
				return;
			}
			const room = this.clientRoom.get(client.user.info.uid);
			if (room) {
				room.members.delete(client);
				if (room.members.size === 0) {
					this.clientRoom.delete(client.user.info.uid);
				}
				if (room.leader === client) {
					room.leader = room.members.values().next()
						.value as WebSocket;
				}
			}
		} catch (error) {
			console.error('Error during disconnect:', error);
		}
	}

	@SubscribeMessage('music')
	handleMusicMessage(client: WebSocket, data: string) {
		const parseResult = WSMusicMessageClientPayloadSchema.safeParse(data);
		if (!parseResult.success) {
			throw new WsException('Invalid payload');
		}
		const result = parseResult.data;
		const room = this.clientRoom.get(client.user.info.uid);
		if (!room) {
			throw new WsException('Not in a room');
		}

		if (result.action === 'play' || result.action === 'pause') {
			if (client !== room.leader) {
				room.leader = client;
			}
		}

		if (room.leader !== client) return;

		const machineSocket = this.machineRoom.get(client.user.info.uid);
		if (!machineSocket) return;

		const payload = {
			action: result.action,
			userID: client.user.info.uid,
			positionMs: result.positionMs,
			trackID: result.trackID ?? '',
			ServerTime: Date.now(),
		};

		machineSocket.send(JSON.stringify({ type: 'music', payload }));
	}

	@SubscribeMessage('others')
	handleOtherMessage(client: WebSocket, data: any) {
		const room = this.clientRoom.get(client.user.info.uid);
		if (!room) {
			throw new WsException('Not in a room');
		}

		console.log(
			'Received other message from',
			client.user.info.uid,
			':',
			data,
		);
	}
}
