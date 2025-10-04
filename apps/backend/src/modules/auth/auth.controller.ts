import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JWKSProvider } from './issuer/jwks.provider.js';
import { LoginRequestDTO } from '#types/dto/auth.dto.js';
import { setAuthCookies } from '#utils/auth/cookies.js';
import type { Response } from 'express';
import { Public } from '#decorators/public.decorator.js';
import { JWTCustomPayload } from '@music/api/dto/auth.dto';
import { ConfigService } from '@nestjs/config/dist/index.js';

@Public()
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly jwksProvider: JWKSProvider,
		private readonly configService: ConfigService,
	) {}

	@Post('login')
	async login(
		@Res({ passthrough: true }) res: Response,
		@Body() loginDTO: LoginRequestDTO,
	) {
		const user = await this.authService.validateUser(
			loginDTO.username,
			loginDTO.password,
		);

		const payload: JWTCustomPayload = {
			type: 'access',
			info: {
				uid: user.id.toString(),
				role: user.role,
			},
		};

		const token = await this.jwksProvider.signAccessToken(payload);

		setAuthCookies(
			res,
			token,
			this.configService.get('appConfig.security.cookies.domain')!,
		);

		return { token };
	}
}
