import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Users } from '#database/entities/users.js';
import { ConfigService } from '@nestjs/config';
import {
	AuthenticationResponseJSON,
	generateAuthenticationOptions,
	generateRegistrationOptions,
	RegistrationResponseJSON,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type PublicKeyCredentialRequestOptionsJSON,
	type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/server';
import { WebAuth } from '#database/entities/webauth.js';

@Injectable()
export class AuthService {
	constructor(
		private readonly em: EntityManager,
		private readonly configService: ConfigService,
	) {
		this.origin =
			this.configService.get<string[]>(
				'appConfig.security.cors.origin',
			) ?? [];
		this.rpID = this.configService.get<string>(
			'appConfig.security.cookies.domain',
		)!;
		this.rpName = this.configService.get<string>(
			'appConfig.security.token.audience',
		)!;
	}

	private rpName: string;
	private rpID: string;
	private origin: string[];

	async validateUser(username: string, password: string) {
		const user = await this.em.findOne(
			Users,
			{ username },
			{ populate: ['password'] },
		);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const isPasswordValid = await user.verifyPassword(password);

		if (!isPasswordValid) {
			throw new NotFoundException('Invalid credentials');
		}

		return user;
	}

	async getWebAuthRegistrationOptions(userId: string) {
		const user = await this.em.findOne(
			Users,
			{ id: userId },
			{
				populate: ['WebAuths'],
			},
		);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		const userWebAuths = user.WebAuths.getItems();

		const opts = await generateRegistrationOptions({
			rpName: this.rpName,
			rpID: this.rpID,
			userName: user.username,
			attestationType: 'none',
			excludeCredentials: userWebAuths.map((key) => ({
				id: key.credentialID,
				transports: key.device,
			})),
			authenticatorSelection: {
				residentKey: 'preferred',
				userVerification: 'preferred',
			},
		});

		return opts;
	}

	async verifyWebAuthRegistration(
		userid: string,
		options: PublicKeyCredentialCreationOptionsJSON,
		body: RegistrationResponseJSON,
	) {
		let verification;
		try {
			verification = await verifyRegistrationResponse({
				response: body,
				expectedChallenge: options.challenge,
				expectedOrigin: this.origin,
				expectedRPID: this.rpID,
			});
		} catch (error) {
			console.error(error);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			throw new BadRequestException({ error: error.message });
		}

		if (!verification.verified) {
			throw new BadRequestException({ error: 'Verification failed' });
		}
		const { verified, registrationInfo } = verification;

		const existingDevice = await this.em.findOne(WebAuth, {
			credentialID: registrationInfo.credential.id,
		});

		if (existingDevice) {
			throw new BadRequestException({
				error: 'Device already registered',
			});
		}
		const user = await this.em.findOne(Users, { id: userid });

		const newDevice = this.em.create(WebAuth, {
			webAuthUserID: options.user.id,
			user: user!,
			credentialID: registrationInfo.credential.id,
			publicKeyBlob: Buffer.from(registrationInfo.credential.publicKey),
			counter: BigInt(registrationInfo.credential.counter),
			device: registrationInfo.credential.transports,
			deviceType: registrationInfo.credentialDeviceType,
			backedUp: registrationInfo.credentialBackedUp,
		});
		await this.em.persistAndFlush(newDevice);

		return { verified, newDeviceId: newDevice.id };
	}

	async getWebAuthAuthenticationOptions() {
		const options = await generateAuthenticationOptions({
			rpID: this.rpID,
			userVerification: 'preferred',
		});

		return options;
	}

	async verifyWebAuthAuthentication(
		options: PublicKeyCredentialRequestOptionsJSON,
		body: AuthenticationResponseJSON,
	): Promise<{ verified: boolean; user: Users }> {
		const webAuth = await this.em.findOne(
			WebAuth,
			{ credentialID: body.id },
			{ populate: ['user'] },
		);

		if (!webAuth) {
			throw new BadRequestException({ error: 'Unknown device' });
		}

		let verification;
		try {
			verification = await verifyAuthenticationResponse({
				response: body,
				expectedChallenge: options.challenge,
				expectedOrigin: this.origin,
				expectedRPID: this.rpID,
				credential: {
					id: webAuth.credentialID,
					publicKey: new Uint8Array(webAuth.publicKeyBlob),
					counter: Number(webAuth.counter),
					transports: webAuth.device,
				},
			});
			webAuth.lastUsedAt = new Date();
		} catch (error) {
			console.log(error);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			throw new BadRequestException({ error: error.message });
		}

		const { verified, authenticationInfo } = verification;
		if (!verified) {
			throw new BadRequestException({ error: 'Verification failed' });
		}

		webAuth.counter = BigInt(authenticationInfo.newCounter);
		webAuth.lastUsedAt = new Date();
		await this.em.persistAndFlush(webAuth);
		return { verified, user: webAuth.user as Users };
	}

	async setWebAuthDeviceName(useid: string, id: string, name: string) {
		const webAuth = await this.em.findOne(WebAuth, { id, user: useid });
		if (!webAuth) {
			throw new NotFoundException('WebAuth device not found');
		}
		webAuth.name = name;
		await this.em.persistAndFlush(webAuth);
	}

	async getWebAuthDevicesForUser(userId: string) {
		const user = await this.em.findOne(
			Users,
			{ id: userId },
			{ populate: ['WebAuths'] },
		);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		const devices = user.WebAuths.getItems();

		return devices.map((device) => ({
			id: device.id,
			name: device.name || 'Unnamed Device',
			deviceType: device.deviceType,
			device: device.device,
			createdAt: device.createdAt.toISOString(),
			lastUsedAt: device.lastUsedAt.toISOString(),
		}));
	}

	async removeWebAuthDevice(id: string) {
		const webAuth = await this.em.findOne(WebAuth, { id });
		if (!webAuth) {
			throw new NotFoundException('WebAuth device not found');
		}
		await this.em.removeAndFlush(webAuth);
	}
}
