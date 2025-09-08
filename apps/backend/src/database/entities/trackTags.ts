import { Entity, ManyToOne, type Rel } from '@mikro-orm/core';
import { Tags } from './tags.js';
import { Tracks } from './tracks.js';

@Entity()
export class TrackTags {
	@ManyToOne({ entity: () => Tracks, primary: true })
	track!: Rel<Tracks>;

	@ManyToOne({ entity: () => Tags, primary: true })
	tag!: Rel<Tags>;
}
