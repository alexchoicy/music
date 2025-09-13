import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Artists } from '#database/entities/artists.js';
import { StorageService } from '../uploads/storageServices/storageServiceAbstract.js';
import mime from 'mime';
import { ArtistDetailDTO } from '#types/dto/music.dto.js';
import { AlbumTracks } from '#database/entities/albumTracks.js';

@Injectable()
export class ArtistsService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}

	async getArtists(cursor: string | null) {
		const artists = await this.em.findByCursor(
			Artists,
			{},
			{
				after: cursor || undefined,
				orderBy: { name: 'ASC' },
			},
		);

		return {
			total: artists.totalCount,
			hasPrev: artists.hasPrevPage,
			hasNext: artists.hasNextPage,
			cursor: artists.hasNextPage ? artists.endCursor || null : null,
			items: artists.items,
		};
	}

	async getArtist(id: string) {
		const artist = await this.em.findOne(
			Artists,
			{ id },
			{
				populate: [
					'albumsCollection',
					'artistGroups.groupMembersCollection.artist',
					'albumsCollection.coverAttachment',
				],
			},
		);

		if (!artist) {
			throw new NotFoundException('Artist not found');
		}

		const albums = [];

		for (const album of artist.albumsCollection) {
			const total = await this.em
				.createQueryBuilder(AlbumTracks, 'at')
				.innerJoin('at.track', 't')
				.where({ album: album.id })
				.andWhere({ 't.isInstrumental': false })
				.getCount();
			albums.push({
				id: album.id.toString(),
				name: album.name,
				year: album.year,
				language: null,
				albumType: album.albumType,
				cover:
					album.coverAttachment && album.coverAttachment.fileType
						? await this.storageService.getAlbumCoverDataUrl(
								album.coverAttachment.id,
								mime.getExtension(
									album.coverAttachment.fileType,
								) ?? '',
							)
						: null,
				totalTracks: total,
				hasInstrumental:
					total < (await album.albumTracksCollection.loadCount()),
				mainArtist: {
					id: artist.id.toString(),
					name: artist.name,
					language: null,
					image: null,
					artistType: artist.artistType as string,
					createdAt: artist.createdAt.toISOString(),
					updatedAt: artist.updatedAt.toISOString(),
				},
				createdAt: album.createdAt.toISOString(),
				updatedAt: album.updatedAt.toISOString(),
			});
		}

		const groupMembers = [];
		if (artist.artistType === 'group' || artist.artistType === 'project') {
			const members = artist.artistGroups?.groupMembersCollection;
			if (members) {
				for (const member of members) {
					groupMembers.push({
						id: member.artist.id.toString(),
						name: member.artist.name,
						artistType: member.artist.artistType as string,
						image: null,
					});
				}
			}
		}

		const result = ArtistDetailDTO.create({
			id: artist.id.toString(),
			name: artist.name,
			artistType: artist.artistType as string,
			image: null,
			albums,
			groupMembers,
		});

		return result;
	}
}
