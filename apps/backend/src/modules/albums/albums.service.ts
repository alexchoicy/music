import { Injectable } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Albums } from '#database/entities/albums.js';

@Injectable()
export class AlbumsService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
	) {}

	async getAlbums(cursor: string | null) {
		const albums = await this.em.findByCursor(
			Albums,
			{},
			{
				first: 2,
				after: cursor || undefined,
				orderBy: { id: 'DESC', createdAt: 'DESC' },
			},
		);

		console.log(albums.endCursor);

		return albums;
	}

	async getAlbum(id: string) {
		const album = await this.em.findOne(
			Albums,
			{ id },
			{
				populate: [
					'albumTracksCollection',
					'albumTracksCollection.track',
					'mainArtist',
					'albumTracksCollection.track.trackArtistsCollection.artist',
					'coverAttachment',
				],
			},
		);
		return album;
	}
}
