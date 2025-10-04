import { JWTCustomPayload } from '@music/api/dto/auth.dto';

declare global {
	export namespace Express {
		export interface Request {
			user: JWTCustomPayload;
		}
	}
}
