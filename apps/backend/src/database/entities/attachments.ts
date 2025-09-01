import {
  Collection,
  Entity,
  OneToMany,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Albums } from './albums.js';

@Entity()
export class Attachments {
  @PrimaryKey({ autoincrement: true })
  id!: bigint;

  @Property({ type: 'text' })
  entityType!: string;

  @Property({ type: 'text' })
  path!: string;

  @Property({ type: 'text' })
  fileType!: string;

  @Property({ type: 'text', nullable: true })
  label?: string;

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
