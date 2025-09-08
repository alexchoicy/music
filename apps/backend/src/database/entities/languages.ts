import {
	Collection,
	Entity,
	OneToMany,
	PrimaryKey,
	Property,
} from '@mikro-orm/core';
import { Albums } from './albums.js';
import { Artists } from './artists.js';
import { Tracks } from './tracks.js';

@Entity()
export class Languages {
	@PrimaryKey({ autoincrement: true })
	id!: bigint;

	@Property({ type: 'text', unique: 'languages_name_key' })
	name!: string;

	@OneToMany({ entity: () => Albums, mappedBy: 'language' })
	albumsCollection = new Collection<Albums>(this);

	@OneToMany({ entity: () => Artists, mappedBy: 'language' })
	artistsCollection = new Collection<Artists>(this);

	@OneToMany({ entity: () => Tracks, mappedBy: 'language' })
	tracksCollection = new Collection<Tracks>(this);
}
