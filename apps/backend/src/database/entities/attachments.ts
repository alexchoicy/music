import {
	Collection,
	Entity,
	OneToMany,
	type Opt,
	PrimaryKey,
	Property,
} from '@mikro-orm/core';
import { Albums } from './albums.js';
import { v4 as uuid } from 'uuid';

@Entity()
export class Attachments {
	@PrimaryKey({ type: 'uuid' })
	id: string = uuid();

	@Property({ type: 'text' })
	entityType!: string;

	@Property({ type: 'text' })
	fileType!: string;

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
	updatedAt!: Date & Opt;

	@OneToMany({ entity: () => Albums, mappedBy: 'coverAttachment' })
	albumsCollection = new Collection<Albums>(this);
}
