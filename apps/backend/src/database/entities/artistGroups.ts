import {
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryKey,
  type Rel,
} from '@mikro-orm/core';
import { Artists } from './artists.js';
import { GroupMembers } from './groupMembers.js';

@Entity()
export class ArtistGroups {
  @PrimaryKey({ autoincrement: true })
  id!: bigint;

  @OneToOne({ entity: () => Artists, unique: 'artist_groups_artist_id_key' })
  artist!: Rel<Artists>;

  @OneToMany({ entity: () => GroupMembers, mappedBy: 'group' })
  groupMembersCollection = new Collection<GroupMembers>(this);
}
