import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Albums } from '#database/entities/albums.js';
import { StorageService } from '../uploads/storageServices/storageServiceAbstract.js';
import { AlbumDetailDTO } from '#types/dto/music.dto.js';
import {
	AlbumResponse,
	AlbumResponseSchema,
	Artist,
	Track,
	TrackSchema,
} from '@music/api/dto/album.dto';
import mime from 'mime';
import { getMusicExt } from '#utils/upload/utils.js';
import { Pagination } from '@music/api/type/Pagination';
import { AlbumTracks } from '#database/entities/albumTracks.js';

@Injectable()
export class AlbumsService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}

	async getAlbums(cursor: string | null): Promise<Pagination<AlbumResponse>> {
		const albums = await this.em.findByCursor(
			Albums,
			{},
			{
				populate: ['mainArtist', 'coverAttachment'],
				first: 10,
				after: cursor || undefined,
				orderBy: { id: 'DESC', createdAt: 'DESC' },
			},
		);
		const formatted = [];
		for (const album of albums.items) {
			const total = await this.em
				.createQueryBuilder(AlbumTracks, 'at')
				.leftJoin('at.track', 't')
				.where({ album: album.id })
				.andWhere({ 't.isInstrumental': false })
				.getCount();
			formatted.push(
				AlbumResponseSchema.parse({
					id: album.id.toString(),
					name: album.name,
					year: album.year,
					language: null,
					albumType: album.albumType,
					totalTracks: total,
					hasInstrumental:
						total < (await album.albumTracksCollection.loadCount()),
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
						language: null,
						artistType: album.mainArtist?.artistType as string,
						createdAt: album.mainArtist?.createdAt.toISOString(),
						updatedAt: album.mainArtist?.updatedAt.toISOString(),
					}),
					createdAt: album.createdAt.toISOString(),
					updatedAt: album.updatedAt.toISOString(),
				}),
			);
		}

		console.log(albums);

		return {
			total: albums.totalCount,
			hasPrev: albums.hasPrevPage,
			hasNext: albums.hasNextPage,
			cursor: albums.hasNextPage ? albums.endCursor || null : null,
			items: formatted,
		};
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
					'albumTracksCollection.track.trackQualityCollection',
				],
			},
		);

		if (!album) {
			throw new NotFoundException('Album not found');
		}

		const discMap = new Map<number, TrackSchema[]>();
		for (const albumTrack of album.albumTracksCollection) {
			if (!discMap.has(albumTrack.discNo)) {
				discMap.set(albumTrack.discNo, []);
			}

			const disc = discMap.get(albumTrack.discNo)!;

			const track = Track.parse({
				id: albumTrack.track.id.toString(),
				name: albumTrack.track.name,
				trackNo: albumTrack.trackNo,
				durationMs: albumTrack.track.durationMs,
				isInstrumental: albumTrack.track.isInstrumental,
				language: null,
				musicBrainzId: albumTrack.track.musicbrainzTrackId || null,
				quality: [],

				artists: [],

				createdAt: albumTrack.track.createdAt.toISOString(),
				updatedAt: albumTrack.track.updatedAt.toISOString(),
			});

			for (const trackArtist of albumTrack.track.trackArtistsCollection) {
				track.artists.push(
					Artist.parse({
						id: trackArtist.artist.id.toString(),
						name: trackArtist.artist.name,
						language: null,
						artistType: trackArtist.artist.artistType as string,
						createdAt: trackArtist.artist.createdAt.toISOString(),
						updatedAt: trackArtist.artist.updatedAt.toISOString(),
					}),
				);
			}

			for (const quality of albumTrack.track.trackQualityCollection) {
				const parsedQuality = {
					url: await this.storageService.getMusicDataUrl(
						quality.hash,
						quality.type,
						getMusicExt(quality.fileContainer, quality.fileCodec) ||
							'',
					),
					type: quality.type,
					fileCodec: quality.fileCodec,
					fileContainer: quality.fileContainer,
					bitrate: quality.bitrate ?? 0,
					sampleRate: quality.sampleRate ?? 0,
					islossless: quality.islossless,
					createdAt: quality.createdAt.toISOString(),
					updatedAt: quality.updatedAt.toISOString(),
				};
				track.quality.push(parsedQuality);
			}

			disc.push(track);
		}

		const mainArtist = Artist.parse({
			id: album.mainArtist?.id.toString(),
			name: album.mainArtist?.name,
			language: null,
			artistType: album.mainArtist?.artistType as string,
			createdAt: album.mainArtist?.createdAt.toISOString(),
			updatedAt: album.mainArtist?.updatedAt.toISOString(),
		});

		const result = AlbumDetailDTO.create({
			id: album.id.toString(),
			name: album.name,
			year: album.year,
			language: null,
			albumType: album.albumType,
			musicbrainzId: album.musicbrainzAlbumId || null,
			cover:
				album.coverAttachment && album.coverAttachment.fileType
					? await this.storageService.getAlbumCoverDataUrl(
							album.coverAttachment.id,
							mime.getExtension(album.coverAttachment.fileType) ??
								'',
						)
					: null,
			Disc: Array.from(discMap.entries())
				.map(([discNo, tracks]) => ({
					discNo,
					tracks,
				}))
				.sort((a, b) => a.discNo - b.discNo),
			createdAt: album.createdAt.toISOString(),
			updatedAt: album.updatedAt.toISOString(),
			mainArtist: mainArtist,
		});

		return result;
	}
}
