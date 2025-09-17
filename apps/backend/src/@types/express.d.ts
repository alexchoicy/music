import { JWTPayload } from '#modules/auth/issuer/jwks.provider.js';

declare global {
	export namespace Express {
		export interface Request {
			info: JWTPayload;
		}
	}
}
