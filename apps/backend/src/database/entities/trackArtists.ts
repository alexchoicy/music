import { Entity, ManyToOne, type Rel } from '@mikro-orm/core';
import { Artists } from './artists.js';
import { Tracks } from './tracks.js';

@Entity()
export class TrackArtists {
  @ManyToOne({ entity: () => Tracks, primary: true })
  track!: Rel<Tracks>;

  @ManyToOne({ entity: () => Artists, primary: true })
  artist!: Rel<Artists>;
}
