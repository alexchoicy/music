import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import session from 'express-session';
// BigInt JSON serialization
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(BigInt.prototype as any).toJSON = function () {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
	return this.toString();
};

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: true,
	});

	const configService = app.get(ConfigService);

	const corsOptions: CorsOptions = {
		origin: configService.get('appConfig.security.cors.origin'),
		credentials: configService.get('appConfig.security.cors.credentials'),
	};

	app.enableCors(corsOptions);

	app.use(cookieParser());

	app.useWebSocketAdapter(new WsAdapter(app));

	app.useBodyParser('json', { limit: '1gb' });

	//only used for webAuth options
	app.use(
		session({
			secret: process.env.SESSION_SECRET ?? 'default_session_secret',
			resave: false,
			saveUninitialized: false,
			proxy: true,
			cookie: {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite:
					process.env.NODE_ENV === 'production' ? 'none' : 'lax',
				maxAge: 1000 * 60 * 10,
			},
		}),
	);

	const openApiDoc = SwaggerModule.createDocument(
		app,
		new DocumentBuilder()
			.setTitle('Example API')
			.setDescription('Example API description')
			.setVersion('1.0')
			.build(),
	);

	SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc));

	await app.listen(process.env.PORT ?? 3100);
}
void bootstrap();
