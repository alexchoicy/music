import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JWKSProvider, JWTPayload } from './issuer/jwks.provider.js';
import { LoginRequestDTO } from '#types/dto/auth.dto.js';
import { clearAuthCookies, setAuthCookies } from '#utils/auth/cookies.js';
import type { Response } from 'express';
import { Public } from '#decorators/public.decorator.js';

@Public()
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly jwksProvider: JWKSProvider,
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

		const payload: JWTPayload = {
			uid: user.id.toString(),
			type: 'access',
			role: user.role,
		};

		const token = await this.jwksProvider.signAccessToken(payload);

		clearAuthCookies(res);
		setAuthCookies(res, token, 15 * 60); // 15 minutes

		return { token };
	}
}
