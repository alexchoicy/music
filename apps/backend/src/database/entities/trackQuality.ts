import {
	Entity,
	Enum,
	ManyToOne,
	PrimaryKey,
	Property,
	type Opt,
	type Rel,
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Tracks } from './tracks.js';
import type { TrackQualityType } from '@music/api/dto/album.dto';

export enum FileUploadStatus {
	'PENDING',
	'COMPLETED',
}

@Entity()
export class TrackQuality {
	@PrimaryKey({ type: 'uuid ' })
	id: string = uuid();

	@ManyToOne({ entity: () => Tracks })
	track!: Rel<Tracks>;

	@Property({ type: 'text' })
	type!: TrackQualityType;

	@Property({ type: 'text', unique: true })
	hash: string;

	@Property({ type: 'text' })
	uploadHashCheck: string;

	@Property({ type: 'text' })
	fileCodec: string;

	@Property({ type: 'text' })
	fileContainer: string;

	@Property({ type: 'boolean' })
	islossless: boolean & Opt = false;

	@Property({ nullable: true })
	bitrate?: number;

	@Property({ nullable: true })
	sampleRate?: number;

	@Property({ nullable: true })
	sizeBytes?: number;

	@Enum({ items: () => FileUploadStatus })
	uploadStatus: FileUploadStatus;

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
		onUpdate: () => new Date(),
	})
	updatedAt!: Date & Opt;
}
