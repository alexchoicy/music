import { UserRole } from '@music/api/dto/auth.dto';
import { Injectable } from '@nestjs/common';
import * as jose from 'jose';

export interface JWTPayload {
	uid: string;
	type: 'access' | 'refresh' | 'api';
	role?: UserRole;
}

@Injectable()
export class JWKSProvider {
	private privateKey!: CryptoKey;
	private publicJwk!: jose.JWK;
	private kid!: string;

	private Issuer = 'cool-music-app';
	private Audience = 'music-web';

	async onModuleInit() {
		const privatePem = process.env.PRIVATE_KEY
			? process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
			: undefined;
		const publicPem = process.env.PUBLIC_KEY
			? process.env.PUBLIC_KEY.replace(/\\n/g, '\n')
			: undefined;

		if (!privatePem || !publicPem) {
			throw new Error('Missing PUBLIC_KEY / PRIVATE_KEY in env');
		}

		this.privateKey = await jose.importPKCS8(privatePem, 'RS256');
		const publicPemRaw = await jose.importSPKI(publicPem, 'RS256');
		this.publicJwk = await jose.exportJWK(publicPemRaw);

		const kid = await jose.calculateJwkThumbprint(this.publicJwk, 'sha256');

		this.publicJwk.kid = kid;
		this.publicJwk.alg = 'RS256';
		this.publicJwk.use = 'sig';
		this.kid = kid;
	}

	getJwks() {
		return { keys: [this.publicJwk] };
	}

	async signAccessToken(payload: JWTPayload, expiresIn = '15m') {
		return await new jose.SignJWT(payload as any)
			.setProtectedHeader({ alg: 'RS256', kid: this.kid })
			.setIssuedAt()
			// .setExpirationTime(expiresIn)
			.setIssuer(this.Issuer)
			.setAudience(this.Audience)
			.sign(this.privateKey);
	}

	async verifyToken(token: string) {
		return await jose.jwtVerify(token, this.publicJwk, {
			issuer: this.Issuer,
			audience: this.Audience,
		});
	}
}
