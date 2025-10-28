import { Injectable } from '@nestjs/common';
import { StorageService } from '../storageServices/storageServiceAbstract.js';

import { EntityManager } from '@mikro-orm/postgresql';
import { Albums } from '#database/entities/albums.js';

import type { SearchDTO } from '@music/api/dto/search.dto';
import mime from 'mime';
import { Artists } from '#database/entities/artists.js';

@Injectable()
export class SearchService {
	constructor(
		private readonly storageService: StorageService,
		private readonly em: EntityManager,
	) {}

	private async getCoverDataUrl(id: string, fileType?: string | null) {
		if (!fileType) return null;
		const ext = mime.getExtension(fileType) || '';
		return this.storageService.staticContent.getAlbumCoverDataUrl(id, ext);
	}

	async search(text: string) {
		const data: SearchDTO = { artists: [], albums: [] };

		const albums = await this.em.find(
			Albums,
			{
				name: { $ilike: `%${text}%` },
			},
			{
				populate: [
					'coverAttachment',
					'mainArtist',
					'albumTracksCollection',
				],
			},
		);

		await Promise.all(
			albums.map(async (album) => {
				const imageUrl = album.coverAttachment
					? await this.getCoverDataUrl(
							album.coverAttachment.id,
							album.coverAttachment.fileType,
						)
					: null;

				data.albums.push({
					albumID: album.id.toString(),
					title: album.name,
					artistName: album.mainArtist!.name,
					artistID: album.mainArtist!.id.toString(),
					imageUrl,
					trackCount: album.albumTracksCollection.length,
				});
			}),
		);

		const artists = await this.em.find(
			Artists,
			{
				$or: [
					{ name: { $ilike: `%${text}%` } },
					{ aliases: { alias: { $ilike: `%${text}%` } } },
				],
			},
			{
				populate: [
					'profilePic',
					'albumsCollection',
					'albumsCollection.coverAttachment',
				],
			},
		);

		await Promise.all(
			artists.map(async (artist) => {
				const firstAlbum =
					artist.albumsCollection &&
					artist.albumsCollection.length > 0
						? artist.albumsCollection[0]
						: null;

				const attachment =
					artist.profilePic ??
					(firstAlbum && firstAlbum.coverAttachment) ??
					null;

				const imageUrl =
					attachment && attachment.fileType
						? await this.getCoverDataUrl(
								attachment.id,
								attachment.fileType,
							)
						: null;

				data.artists.push({
					artistID: artist.id.toString(),
					name: artist.name,
					imageUrl,
					albumCount: artist.albumsCollection
						? artist.albumsCollection.length
						: 0,
				});
			}),
		);
		return data;
	}
}
