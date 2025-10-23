import {
	BeforeCreate,
	BeforeUpdate,
	Collection,
	Entity,
	Enum,
	type EventArgs,
	OneToMany,
	type Opt,
	PrimaryKey,
	Property,
} from '@mikro-orm/core';
import { hash, verify } from 'argon2';
import { WebAuth } from './webauth.js';
import { type UserRole, UserRolesSchema } from '@music/api/dto/auth.dto';

@Entity()
export class Users {
	@PrimaryKey({ autoincrement: true })
	id!: bigint;

	@Property({ type: 'text', unique: true })
	username: string;

	@Property({ type: 'text' })
	displayname: string;

	@Property({ hidden: true, lazy: true })
	password: string;

	@Enum({ items: () => UserRolesSchema.options, default: 'user' })
	role: UserRole = 'user';

	@Property({
		type: 'datetime',
		columnType: 'timestamp(6)',
		defaultRaw: `now()`,
	})
	createdAt: Date & Opt;
	@Property({
		type: 'datetime',
		columnType: 'timestamp(6)',
		defaultRaw: `now()`,
	})
	updatedAt: Date & Opt;
	@Property({
		type: 'datetime',
		columnType: 'timestamp(6)',
		defaultRaw: `now()`,
	})
	lastLoginAt: Date & Opt;

	@OneToMany({ entity: () => WebAuth, mappedBy: 'user' })
	WebAuths = new Collection<WebAuth>(this);

	constructor(username: string, displayname: string, password: string) {
		this.username = username;
		this.displayname = displayname;
		this.password = password;
		this.createdAt = new Date();
		this.updatedAt = new Date();
	}

	@BeforeUpdate()
	@BeforeCreate()
	async hashPassword(args: EventArgs<Users>) {
		const password = args.changeSet?.payload.password;
		if (password) {
			this.password = await hash(password);
		}
	}

	async verifyPassword(password: string) {
		return await verify(this.password, password);
	}
}
