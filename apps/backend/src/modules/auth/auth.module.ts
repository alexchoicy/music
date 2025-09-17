import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JWKSProvider } from './issuer/jwks.provider.js';
import { JwksController } from './issuer/well-known.controller.js';

@Module({
	controllers: [AuthController, JwksController],
	providers: [AuthService, JWKSProvider],
})
export class AuthModule { }
