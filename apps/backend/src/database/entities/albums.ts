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

@Entity()
export class Albums {
  @PrimaryKey({ autoincrement: true })
  id!: bigint;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'integer' })
  totalDiscs: number & Opt = 1;

  @Property()
  totalTracks!: number;

  @Property()
  year!: number;

  @ManyToOne({ entity: () => Languages, nullable: true })
  language?: Rel<Languages>;

  @ManyToOne({ entity: () => Artists, nullable: true })
  mainArtist?: Rel<Artists>;

  @Enum({ items: () => AlbumsAlbumType })
  albumType: AlbumsAlbumType & Opt = AlbumsAlbumType.LP;

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

export enum AlbumsAlbumType {
  LP = 'LP',
  EP = 'EP',
  SINGLE = 'Single',
  COMPILATION = 'Compilation',
  SOUNDTRACK = 'Soundtrack',
  LIVE = 'Live',
  REMIX = 'Remix',
  OTHER = 'Other',
}
