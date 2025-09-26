import {
	BigIntType,
	Entity,
	Enum,
	ManyToOne,
	type Opt,
	PrimaryKey,
	Property,
	type Rel,
} from '@mikro-orm/core';
import { Users } from './users.js';

import type {
	AuthenticatorTransportFuture,
	CredentialDeviceType,
	Base64URLString,
} from '@simplewebauthn/server';

@Entity()
export class WebAuth {
	@PrimaryKey({ type: 'string' })
	id: Base64URLString;

	@ManyToOne({ entity: () => Users })
	user: Rel<Users>;

	@Property({ type: 'uint8array' })
	publicKey: Uint8Array;

	@Property({ type: 'text' })
	webAuthUserID: Base64URLString;

	@Property({ type: BigIntType })
	counter!: string;

	@Enum({ items: () => ['singleDevice', 'multiDevice'] })
	deviceType!: CredentialDeviceType;

	@Property()
	backedUp!: boolean;

	@Property({ type: 'json', nullable: true })
	transports?: AuthenticatorTransportFuture[];

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
