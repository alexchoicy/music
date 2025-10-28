import {
	Collection,
	Entity,
	Enum,
	ManyToOne,
	OneToMany,
	OneToOne,
	type Opt,
	PrimaryKey,
	Property,
	type Rel,
} from '@mikro-orm/core';
import { Albums } from './albums.js';
import { ArtistGroups } from './artistGroups.js';
import { GroupMembers } from './groupMembers.js';
import { Languages } from './languages.js';
import { TrackArtists } from './trackArtists.js';
import { Attachments } from './attachments.js';
import { ArtistsArtistType, type ArtistType } from '@music/api/type/music';

@Entity()
export class Artists {
	@PrimaryKey({ autoincrement: true })
	id!: bigint;

	@Property({ type: 'text' })
	name!: string;

	@ManyToOne({ entity: () => Languages, nullable: true })
	language?: Rel<Languages>;

	@Enum({ items: () => ArtistsArtistType.options })
	artistType!: ArtistType;

	@Property({ type: 'array', columnType: 'text[]' })
	aliases: string[] = [];

	@Property({ type: 'text', nullable: true })
	musicBrainzID?: string | null;

	@Property({ type: 'text', nullable: true })
	area?: string | null;

	@Property({ type: 'text', nullable: true })
	spotifyID?: string | null;

	@Property({ type: 'text', nullable: true })
	twitterName?: string | null;

	@ManyToOne({ entity: () => Attachments, nullable: true })
	profileBanner?: Rel<Attachments>;

	@ManyToOne({ entity: () => Attachments, nullable: true })
	profilePic?: Rel<Attachments>;

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

	@OneToMany({ entity: () => Albums, mappedBy: 'mainArtist' })
	albumsCollection = new Collection<Albums>(this);

	@OneToOne({ entity: () => ArtistGroups, mappedBy: 'artist' })
	artistGroups?: Rel<ArtistGroups>;

	@OneToMany({ entity: () => GroupMembers, mappedBy: 'artist' })
	groupMembersCollection = new Collection<GroupMembers>(this);

	@OneToMany({ entity: () => TrackArtists, mappedBy: 'artist' })
	trackArtistsCollection = new Collection<TrackArtists>(this);
}
