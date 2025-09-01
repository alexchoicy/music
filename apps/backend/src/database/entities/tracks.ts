import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  type Opt,
  PrimaryKey,
  Property,
  type Rel,
} from '@mikro-orm/core';
import { AlbumTracks } from './albumTracks.js';
import { Languages } from './languages.js';
import { TrackArtists } from './trackArtists.js';
import { TrackTags } from './trackTags.js';

@Entity()
export class Tracks {
  @PrimaryKey({ autoincrement: true })
  id!: bigint;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', unique: true })
  hash!: string;

  @Property()
  durationMs!: number;

  @Property({ type: 'text' })
  path!: string;

  @Property({ type: 'text' })
  fileType!: string;

  @Property({ type: 'boolean' })
  isInstrumental: boolean & Opt = false;

  @ManyToOne({ entity: () => Languages, nullable: true })
  language?: Rel<Languages>;

  @Property({ nullable: true })
  bitrate?: number;

  @Property({ nullable: true })
  sampleRate?: number;

  @Property({ type: 'uuid', nullable: true })
  musicbrainzTrackId?: string;

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

  @OneToMany({ entity: () => AlbumTracks, mappedBy: 'track' })
  albumTracksCollection = new Collection<AlbumTracks>(this);

  @OneToMany({ entity: () => TrackArtists, mappedBy: 'track' })
  trackArtistsCollection = new Collection<TrackArtists>(this);

  @OneToMany({ entity: () => TrackTags, mappedBy: 'track' })
  trackTagsCollection = new Collection<TrackTags>(this);
}
