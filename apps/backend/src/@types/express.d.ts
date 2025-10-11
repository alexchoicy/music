import { JWTCustomPayload } from '@music/api/dto/auth.dto';
import WebSocket from 'ws';

declare global {
	namespace Express {
		interface Request {
			user: JWTCustomPayload;
		}
	}
}

declare module 'ws' {
	interface WebSocket {
		user: JWTCustomPayload;
		isAlive?: boolean;
	}
}
