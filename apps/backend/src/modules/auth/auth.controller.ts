import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Post,
	Put,
	Req,
	Res,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JWKSProvider } from './issuer/jwks.provider.js';
import { LoginRequestDTO } from '#types/dto/auth.dto.js';
import { setAuthCookies } from '#utils/auth/cookies.js';
import type { Request, Response } from 'express';
import type {
	RegistrationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	AuthenticationResponseJSON,
	PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

declare module 'express-session' {
	interface SessionData {
		webAuthRegistrationOptions?: PublicKeyCredentialCreationOptionsJSON;
		webAuthAuthenticationOptions?: PublicKeyCredentialRequestOptionsJSON;
	}
}
import { Public } from '#decorators/public.decorator.js';
import { JWTCustomPayload } from '@music/api/dto/auth.dto';
import { ConfigService } from '@nestjs/config/dist/index.js';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly jwksProvider: JWKSProvider,
		private readonly configService: ConfigService,
	) {}

	@Public()
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

	@Get('machineToken')
	async getMachineToken(@Req() req: Request) {
		const userInfo = req.user;

		if (!userInfo || userInfo.type === 'machine') {
			throw new Error('Unauthorized');
		}

		const payload: JWTCustomPayload = {
			type: 'machine',
			info: { uid: userInfo.info.uid, role: userInfo.info.role },
		};

		const token = await this.jwksProvider.signAccessToken(payload);

		return token;
	}

	@Get('webauth/options-registration')
	async getWebAuthRegistrationOptions(@Req() req: Request) {
		const userInfo = req.user;
		if (!userInfo) {
			throw new UnauthorizedException('Unauthorized');
		}
		const options = await this.authService.getWebAuthRegistrationOptions(
			userInfo.info.uid,
		);
		req.session.webAuthRegistrationOptions = options;
		return options;
	}

	@Post('webauth/verify-registration')
	async verifyWebAuthRegistration(
		@Req() req: Request,
		@Body() body: RegistrationResponseJSON,
	) {
		const userInfo = req.user;
		if (!userInfo) {
			throw new UnauthorizedException('Unauthorized');
		}

		const options = req.session.webAuthRegistrationOptions;
		if (!options) {
			throw new NotFoundException(
				'No registration options found in session',
			);
		}

		req.session.webAuthRegistrationOptions = undefined;

		return this.authService.verifyWebAuthRegistration(
			userInfo.info.uid,
			options,
			body,
		);
	}

	@Public()
	@Get('webauth/options-authentication')
	async getWebAuthAuthenticationOptions(@Req() req: Request) {
		const options =
			await this.authService.getWebAuthAuthenticationOptions();
		req.session.webAuthAuthenticationOptions = options;
		return options;
	}

	@Public()
	@Post('webauth/verify-authentication')
	async verifyWebAuthAuthentication(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@Body() body: AuthenticationResponseJSON,
	) {
		const options = req.session.webAuthAuthenticationOptions;
		if (!options) {
			throw new NotFoundException(
				'No authentication options found in session',
			);
		}

		const result = await this.authService.verifyWebAuthAuthentication(
			options,
			body,
		);

		if (!result || !result.verified) {
			throw new UnauthorizedException('Authentication failed');
		}

		const payload: JWTCustomPayload = {
			type: 'access',
			info: {
				uid: result.user.id.toString(),
				role: result.user.role,
			},
		};

		const token = await this.jwksProvider.signAccessToken(payload);

		setAuthCookies(
			res,
			token,
			this.configService.get('appConfig.security.cookies.domain')!,
		);

		req.session.webAuthAuthenticationOptions = undefined;
		return { verified: result.verified };
	}

	@Put('webauth/name')
	async setWebAuthDeviceName(
		@Body() body: { id: string; name: string },
		@Req() req: Request,
	) {
		return this.authService.setWebAuthDeviceName(
			req.user.info.uid,
			body.id,
			body.name,
		);
	}

	@Get('webauth/devices')
	async getWebAuthDevices(@Req() req: Request) {
		const userInfo = req.user;
		if (!userInfo) {
			throw new UnauthorizedException('Unauthorized');
		}

		return this.authService.getWebAuthDevicesForUser(userInfo.info.uid);
	}

	@Delete('webauth/device/:id')
	async removeWebAuthDevice(@Req() req: Request) {
		const userInfo = req.user;
		if (!userInfo) {
			throw new UnauthorizedException('Unauthorized');
		}
		const { id } = req.params;
		return this.authService.removeWebAuthDevice(userInfo.info.uid, id);
	}
}
