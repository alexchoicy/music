import {
	Entity,
	Enum,
	ManyToOne,
	Opt,
	PrimaryKey,
	Property,
	type Rel,
	Unique,
} from '@mikro-orm/core';
import type {
	AuthenticatorTransportFuture,
	CredentialDeviceType,
	Base64URLString,
} from '@simplewebauthn/server';
import { v4 as uuid } from 'uuid';
import { Users } from './users.js';

export enum DeviceType {
	singleDevice = 'singleDevice',
	multiDevice = 'multiDevice',
}

@Entity()
@Unique({ properties: ['webAuthUserID', 'user'] })
export class WebAuth {
	//this is possible to be useless but leaving it for now
	@PrimaryKey({ type: 'uuid' })
	id: string = uuid();

	@Property({ type: 'text', unique: true })
	credentialID!: Base64URLString;

	@Property({ type: 'bytea' })
	publicKeyBlob!: Buffer;

	@Property({ type: 'text', index: 'webauth_user_id_index' })
	webAuthUserID!: Base64URLString;

	@Property({ type: 'bigint' })
	counter!: bigint;

	@Enum({ items: () => DeviceType })
	deviceType!: CredentialDeviceType;

	@Property()
	backedUp!: boolean;

	@Property({ type: 'json', nullable: true })
	device?: AuthenticatorTransportFuture[];

	@ManyToOne({ entity: () => Users })
	user: Rel<Users>;

	@Property({
		type: 'datetime',
		columnType: 'timestamp(6)',
		defaultRaw: `now()`,
	})
	createdAt!: Date & Opt;

	@Property({
		type: 'datetime',
		columnType: 'timestamp(6)',
		defaultRaw: `now()`,
	})
	lastUsedAt!: Date & Opt;
}
