import {
	Collection,
	Entity,
	OneToMany,
	PrimaryKey,
	Property,
} from '@mikro-orm/core';
import { TrackTags } from './trackTags.js';

@Entity()
export class Tags {
	@PrimaryKey({ autoincrement: true })
	id!: bigint;

	@Property({ type: 'text', unique: 'tags_name_key' })
	name!: string;

	@OneToMany({ entity: () => TrackTags, mappedBy: 'tag' })
	trackTagsCollection = new Collection<TrackTags>(this);
}
