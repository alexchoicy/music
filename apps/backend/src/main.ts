import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

// BigInt JSON serialization
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(BigInt.prototype as any).toJSON = function () {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
	return this.toString();
};

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: true,
		cors: {
			origin: ['http://localhost:3000'],
			credentials: true,
		},
	});

	app.use(cookieParser());

	app.useBodyParser('json', { limit: '1gb' });

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
