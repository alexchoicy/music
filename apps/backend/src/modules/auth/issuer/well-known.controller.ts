import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/index.js';
import { JWKSProvider } from './jwks.provider.js';

@Controller('.well-known')
export class JwksController {
	constructor(
		private readonly config: ConfigService,
		private readonly key: JWKSProvider,
	) {}
	@Get('jwks.json')
	jwks() {
		return this.key.getJwks();
	}
}
