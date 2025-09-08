import {
	Collection,
	Entity,
	Enum,
	ManyToOne,
	OneToMany,
	type Opt,
	PrimaryKey,
	Property,
	type Rel,
} from '@mikro-orm/core';
import { AlbumTracks } from './albumTracks.js';
import { Artists } from './artists.js';
import { Attachments } from './attachments.js';

import { Languages } from './languages.js';
import { AlbumsAlbumTypeEnum, AlbumsAlbumType } from '@music/api/type/music';

@Entity()
export class Albums {
	@PrimaryKey({ autoincrement: true })
	id!: bigint;

	@Property({ type: 'text' })
	name!: string;

	@Property()
	year!: number;

	@ManyToOne({ entity: () => Languages, nullable: true })
	language?: Rel<Languages>;

	@ManyToOne({ entity: () => Artists, nullable: true })
	mainArtist?: Rel<Artists>;

	@Enum({ items: () => AlbumsAlbumTypeEnum.options })
	albumType: AlbumsAlbumType & Opt = 'Album';

	@Property({ type: 'uuid', nullable: true })
	musicbrainzAlbumId?: string;

	@ManyToOne({ entity: () => Attachments, nullable: true })
	coverAttachment?: Rel<Attachments>;

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

	@OneToMany({ entity: () => AlbumTracks, mappedBy: 'album' })
	albumTracksCollection = new Collection<AlbumTracks>(this);
}
