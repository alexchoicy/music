import { Module } from '@nestjs/common';
import { wsEventsGateway } from './wsEvents.gateway.js';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';

@Module({
	providers: [wsEventsGateway, JWKSProvider],
})
export class wsEventsModule {}
