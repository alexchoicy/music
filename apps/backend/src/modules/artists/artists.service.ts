import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
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
import {
	AlbumResponse,
	Artist,
	type ArtistInfo,
} from '@music/api/dto/album.dto';
import { Albums } from '#database/entities/albums.js';

import pLimit from 'p-limit';

@Injectable()
export class ArtistsService {
	constructor(
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}
	private async getCoverDataUrl(id: string, fileType?: string | null) {
		if (!fileType) return null;
		const ext = mime.getExtension(fileType) || '';
		return this.storageService.getAlbumCoverDataUrl(id, ext);
	}

	private async getAlbumStats(album: Albums) {
		const [nonInstrumentalTracks, totalTracks] = await Promise.all([
			this.em.count(AlbumTracks, {
				album: album.id,
				track: { isInstrumental: false },
			}),
			this.em.count(AlbumTracks, { album: album.id }),
		]);
		return {
			totalTracks: nonInstrumentalTracks,
			hasInstrumental: nonInstrumentalTracks < totalTracks,
		};
	}

	async getArtistInfo(artist: Artists): Promise<ArtistInfo | null> {
		const albumsArr = artist.albumsCollection.isInitialized()
			? artist.albumsCollection.getItems()
			: await artist.albumsCollection.loadItems({
					populate: ['coverAttachment', 'mainArtist'],
				});

		if (!albumsArr) return null;
		const albums = await this.getArtistAlbumsToDTO(albumsArr);
		if (!albums) return null;
		return {
			id: artist.id.toString(),
			name: artist.name,
			image: null,
			language: null,
			artistType: artist.artistType,
			createdAt: artist.createdAt.toISOString(),
			updatedAt: artist.updatedAt.toISOString(),
			albums,
		};
	}

	async getArtistAlbumsToDTO(
		albums: Albums[],
	): Promise<ArtistInfo['albums'] | null> {
		const limit = pLimit(10);

		const albumDTOs = albums.map((album) =>
			limit(async () => {
				const cover =
					(await this.getCoverDataUrl(
						album.coverAttachment?.id || '',
						album.coverAttachment?.fileType,
					)) || null;
				return {
					id: album.id.toString(),
					name: album.name,
					year: album.year,
					language: null,
					albumType: album.albumType,
					cover,
					createdAt: album.createdAt.toISOString(),
					updatedAt: album.updatedAt.toISOString(),
				};
			}),
		);

		const result = await Promise.all(albumDTOs);

		return result.filter((r) => r !== null);
	}

	async getAlbumInfo(album: Albums): Promise<AlbumResponse | null> {
		const [cover, stats] = await Promise.all([
			album.coverAttachment
				? this.getCoverDataUrl(
						album.coverAttachment.id,
						album.coverAttachment.fileType,
					)
				: Promise.resolve(null),
			this.getAlbumStats(album),
		]);
		return {
			id: album.id.toString(),
			name: album.name,
			year: album.year,
			language: null,
			albumType: album.albumType,
			totalTracks: stats.totalTracks,
			hasInstrumental: stats.hasInstrumental,
			cover,
			mainArtist: Artist.parse({
				id: album.mainArtist?.id?.toString(),
				name: album.mainArtist?.name,
				image: null,
				language: null,
				artistType: (album.mainArtist?.artistType ?? '') as string,
				createdAt: album.mainArtist?.createdAt?.toISOString(),
				updatedAt: album.mainArtist?.updatedAt?.toISOString(),
			}),
			createdAt: album.createdAt.toISOString(),
			updatedAt: album.updatedAt.toISOString(),
		};
	}

	async getArtists() {
		const rawArtists = await this.em.findAll(Artists, {
			populate: ['albumsCollection.coverAttachment', 'profilePic'],
		});
		const limit = pLimit(10);

		const promises = rawArtists.map((artist) =>
			limit(async () => {
				return this.getArtistInfo(artist);
			}),
		);

		const result = await Promise.all(promises);
		return result.filter((r) => r !== null);
	}

	async getArtist(id: string) {
		const artist = await this.em.findOne(
			Artists,
			{ id },
			{
				populate: [
					// Own albums (with cover + main artist so DTO can be built)
					'albumsCollection',
					'albumsCollection.coverAttachment',
					'albumsCollection.mainArtist',

					// Tracks this artist appears on -> their album + cover + main artist
					'trackArtistsCollection',
					'trackArtistsCollection.track',
					'trackArtistsCollection.track.albumTracksCollection',
					'trackArtistsCollection.track.albumTracksCollection.album',
					'trackArtistsCollection.track.albumTracksCollection.album.coverAttachment',
					'trackArtistsCollection.track.albumTracksCollection.album.mainArtist',

					// Group relationships (for group members / related groups)
					'artistGroups',
					'artistGroups.groupMembersCollection',
					'artistGroups.groupMembersCollection.artist',
					'groupMembersCollection',
					'groupMembersCollection.group',
					'groupMembersCollection.group.artist',
					'groupMembersCollection.group.artist.albumsCollection',
					'groupMembersCollection.group.artist.albumsCollection.coverAttachment',
					'groupMembersCollection.group.artist.albumsCollection.mainArtist',
				],
			},
		);

		if (!artist) {
			throw new NotFoundException('Artist not found');
		}

		const albums = await Promise.all(
			artist.albumsCollection.map(async (album) => {
				return this.getAlbumInfo(album);
			}),
		);

		const featuredAlbumSet = new Map<string, Albums>();

		for (const ta of artist.trackArtistsCollection ?? []) {
			const albumTracks = ta.track?.albumTracksCollection ?? [];
			for (const at of albumTracks) {
				const album = at.album;
				if (!album) continue;
				if (album.mainArtist?.id === artist.id) continue;
				featuredAlbumSet.set(album.id.toString(), album);
			}
		}

		const featuredIn: AlbumResponse[] = (
			await Promise.all(
				Array.from(featuredAlbumSet.values()).map((album) =>
					this.getAlbumInfo(album),
				),
			)
		).filter((album): album is AlbumResponse => album !== null);

		const groupMembers: ArtistInfo[] = [];
		if (artist.artistType === 'group' || artist.artistType === 'project') {
			const members = artist.artistGroups?.groupMembersCollection;
			if (members) {
				for (const member of members) {
					const info = await this.getArtistInfo(member.artist);
					if (info) groupMembers.push(info);
				}
			}
		}

		const relatedGroups: ArtistInfo[] = [];
		if (artist.groupMembersCollection) {
			for (const membership of artist.groupMembersCollection) {
				const groupInfo = await this.em.findOne(ArtistGroups, {
					id: membership.group.id,
				});
				if (!groupInfo?.artist?.id) continue;

				const groupArtist = await this.em.findOne(
					Artists,
					{ id: groupInfo.artist.id },
					{
						populate: [
							'albumsCollection',
							'albumsCollection.coverAttachment',
							'albumsCollection.mainArtist',
						],
					},
				);
				if (!groupArtist) continue;

				const info = await this.getArtistInfo(groupArtist);
				if (info) relatedGroups.push(info);
			}
		}

		const result = ArtistDetailDTO.create({
			id: artist.id.toString(),
			name: artist.name,
			artistType: artist.artistType as string,
			image: null,
			albums,
			featuredIn,
			groupMembers,
			relatedGroups,
		});

		return result;
	}

	async setArtistRelationship(
		artistID: string,
		artistRelaationshipDTO: ArtistRelationshipDTO,
	) {
		await this.em.transactional(async (tem) => {
			const artist = await tem.findOne(Artists, { id: artistID });
			if (!artist) throw new NotFoundException();

			let group =
				artist.artistType === 'group'
					? await tem.findOne(ArtistGroups, { artist })
					: null;

			if (group) {
				const existing = await tem.find(GroupMembers, { group });
				tem.remove(existing);
				if (artistRelaationshipDTO.artists.length === 0) {
					artist.artistType = 'person';
					tem.remove(group);
					return;
				}
			} else {
				artist.artistType = 'group';
				group = tem.create(ArtistGroups, { artist });
				tem.persist(group);
			}

			const members = await tem.find(Artists, {
				id: { $in: artistRelaationshipDTO.artists },
			});
			const gm = members.map((m) =>
				tem.create(GroupMembers, { artist: m, group }),
			);
			tem.persist(gm);
		});
	}
}
