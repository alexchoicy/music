import {
	Injectable,
	CanActivate,
	type ExecutionContext,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '#decorators/public.decorator.js';
import { Request } from 'express';
import { getAuthTokenFromCookies } from '#utils/auth/cookies.js';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';
import { IS_ADMIN_KEY } from '#decorators/admin.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly jwksProvider: JWKSProvider,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) {
			return true;
		}

		const requestType = context.getType();

		switch (requestType) {
			case 'http': {
				const request = context.switchToHttp().getRequest<Request>();
				const token = this.extractTokenFromHttpRequest(request);
				if (!token) {
					throw new UnauthorizedException('No token provided');
				}
				try {
					const valid = await this.jwksProvider.verifyToken(token);

					const isAdminOnlyPath =
						this.reflector.getAllAndOverride<boolean>(
							IS_ADMIN_KEY,
							[context.getHandler(), context.getClass()],
						);

					if (
						isAdminOnlyPath &&
						valid.payload.info.role !== 'admin'
					) {
						throw new UnauthorizedException('Admin role required');
					}

					request.user = {
						type: valid.payload.type,
						info: {
							uid: valid.payload.info.uid,
							role: valid.payload.info.role,
						},
					};

					return true;
				} catch {
					throw new UnauthorizedException('Invalid token');
				}
			}
			case 'ws': {
				//later
				break;
			}
			default:
				throw new Error(`Unsupported request type: ${requestType}`);
		}

		return false;
	}

	extractTokenFromHttpRequest(request: Request) {
		const authHeader = request.headers['authorization'];
		if (authHeader?.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}
		return getAuthTokenFromCookies(request);
	}
}
