import { JWTCustomPayload } from '@music/api/dto/auth.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/index.js';
import * as jose from 'jose';

@Injectable()
export class JWKSProvider {
	private privateKey!: CryptoKey;
	private publicKey!: CryptoKey;
	private publicJwk!: jose.JWK;
	private kid!: string;

	constructor(private readonly configService: ConfigService) {}

	private Issuer: string;
	private Audience: string;

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
		this.publicKey = await jose.importSPKI(publicPem, 'RS256');
		this.publicJwk = await jose.exportJWK(this.publicKey);

		const kid = await jose.calculateJwkThumbprint(this.publicJwk, 'sha256');

		this.publicJwk.kid = kid;
		this.publicJwk.alg = 'RS256';
		this.publicJwk.use = 'sig';
		this.kid = kid;

		this.Issuer = this.configService.get<string>(
			'appConfig.security.issuer',
		)!;
		this.Audience = this.configService.get<string>(
			'appConfig.security.audience',
		)!;
	}

	getJwks() {
		return { keys: [this.publicJwk] };
	}

	async signAccessToken(payload: JWTCustomPayload) {
		return await new jose.SignJWT(payload as any)
			.setProtectedHeader({ alg: 'RS256', kid: this.kid })
			.setIssuedAt()
			.setIssuer(this.Issuer)
			.setAudience(this.Audience)
			.sign(this.privateKey);
	}

	async verifyToken(
		token: string,
	): Promise<jose.JWTVerifyResult<JWTCustomPayload>> {
		return await jose.jwtVerify(token, this.publicKey, {
			issuer: this.Issuer,
			audience: this.Audience,
		});
	}
}
