import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Artists } from '#database/entities/artists.js';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import mime from 'mime';
import {
	ArtistDetailDTO,
	ArtistRelationshipDTO,
} from '#types/dto/music.dto.js';
import { AlbumTracks } from '#database/entities/albumTracks.js';
import { ArtistGroups } from '#database/entities/artistGroups.js';
import { GroupMembers } from '#database/entities/groupMembers.js';
import { Artist, type ArtistInfo } from '@music/api/dto/album.dto';

@Injectable()
export class ArtistsService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}

	async getArtists() {
		const rawArtists = await this.em.findAll(Artists, {
			populate: ['albumsCollection.coverAttachment', 'profilePic'],
		});

		const artists: ArtistInfo[] = [];

		for (const artist of rawArtists) {
			const albums = [];

			for (const album of artist.albumsCollection) {
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
									) || '',
								)
							: null,
					createdAt: album.createdAt.toISOString(),
					updatedAt: album.updatedAt.toISOString(),
				});
			}
			if (albums.length === 0) continue;
			artists.push({
				id: artist.id.toString(),
				name: artist.name,
				image: null,
				language: null,
				artistType: artist.artistType,
				createdAt: artist.createdAt.toISOString(),
				updatedAt: artist.updatedAt.toISOString(),
				albums,
			});
		}

		return artists;
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
			const nonInstrumentalTracksPromise = this.em
				.createQueryBuilder(AlbumTracks, 'at')
				.innerJoin('at.track', 't')
				.where({ album: album.id })
				.andWhere({ 't.isInstrumental': false })
				.getCount();

			const totalTracksPromise = album.albumTracksCollection.loadCount();

			const [nonInstrumentalTracks, totalTracks] = await Promise.all([
				nonInstrumentalTracksPromise,
				totalTracksPromise,
			]);

			albums.push({
				id: album.id.toString(),
				name: album.name,
				year: album.year,
				language: null,
				albumType: album.albumType,
				totalTracks: nonInstrumentalTracks,
				hasInstrumental: nonInstrumentalTracks < totalTracks,
				cover:
					album.coverAttachment && album.coverAttachment.fileType
						? await this.storageService.getAlbumCoverDataUrl(
								album.coverAttachment.id,
								mime.getExtension(
									album.coverAttachment.fileType,
								) || '',
							)
						: null,
				mainArtist: Artist.parse({
					id: album.mainArtist?.id.toString(),
					name: album.mainArtist?.name,
					image: null,
					language: null,
					artistType: album.mainArtist?.artistType as string,
					createdAt: album.mainArtist?.createdAt.toISOString(),
					updatedAt: album.mainArtist?.updatedAt.toISOString(),
				}),
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
						image: null,
						language: null,
						artistType: member.artist.artistType as string,
						createdAt: member.artist.createdAt.toISOString(),
						updatedAt: member.artist.updatedAt.toISOString(),
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

	async setArtistRelationship(
		artistID: string,
		artistRelaationshipDTO: ArtistRelationshipDTO,
	) {
		const artist = await this.em.findOne(Artists, { id: artistID });
		if (!artist) {
			throw new NotFoundException();
		}
		let group;
		if (artist.artistType === 'group') {
			group = await this.em.findOne(ArtistGroups, { artist });

			const artistGrouped = await this.em.find(GroupMembers, { group });
			await this.em.remove(artistGrouped).flush();

			if (artistRelaationshipDTO.artists.length === 0) {
				artist.artistType = 'person';
				if (group) {
					await this.em.removeAndFlush(group);
				}
				return;
			}
		}

		if (!group) {
			artist.artistType = 'group';
			const newGroup = this.em.create(ArtistGroups, {
				artist,
			});
			await this.em.persistAndFlush(newGroup);

			group = newGroup;
		}

		for (const memberID of artistRelaationshipDTO.artists) {
			const member = await this.em.findOne(Artists, { id: memberID });
			if (member) {
				const gm = this.em.create(GroupMembers, {
					artist: member,
					group,
				});
				await this.em.persistAndFlush(gm);
			}
		}
	}
}
