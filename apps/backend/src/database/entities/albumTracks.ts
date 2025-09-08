import {
	Entity,
	ManyToOne,
	type Rel,
	Property,
	type Opt,
	PrimaryKeyProp,
} from '@mikro-orm/core';
import { Albums } from './albums.js';
import { Tracks } from './tracks.js';

@Entity()
export class AlbumTracks {
	@ManyToOne({ entity: () => Albums, primary: true })
	album!: Rel<Albums>;

	@ManyToOne({ entity: () => Tracks, primary: true })
	track!: Rel<Tracks>;

	@Property({ type: 'integer' })
	discNo: number & Opt = 1;

	@Property()
	trackNo!: number;

	[PrimaryKeyProp]?: ['album', 'track'];
}
