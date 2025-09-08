import { Entity, ManyToOne, type Rel } from '@mikro-orm/core';
import { ArtistGroups } from './artistGroups.js';
import { Artists } from './artists.js';

@Entity()
export class GroupMembers {
	@ManyToOne({ entity: () => ArtistGroups, primary: true })
	group!: Rel<ArtistGroups>;

	@ManyToOne({ entity: () => Artists, primary: true })
	artist!: Rel<Artists>;
}
