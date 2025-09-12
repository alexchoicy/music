import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Albums } from '#database/entities/albums.js';
import { StorageService } from '../uploads/storageServices/storageServiceAbstract.js';
import { AlbumDetailDTO } from '#types/dto/music.dto.js';
import {
	AlbumResponse,
	AlbumResponseSchema,
	Artist,
	ArtistSchema,
	Track,
	TrackSchema,
} from '@music/api/dto/album.dto';
import mime from 'mime';
import { getMusicExt } from '#utils/upload/utils.js';
import { Pagination } from '@music/api/type/pagination';
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
				.innerJoin('at.track', 't')
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
						image: null,
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

		let totalDurationMs = 0;

		const artistsMap = new Map<string, ArtistSchema>();

		const discMap = new Map<number, TrackSchema[]>();

		let count = 0;

		for (const albumTrack of album.albumTracksCollection) {
			if (!discMap.has(albumTrack.discNo)) {
				discMap.set(albumTrack.discNo, []);
			}

			if (albumTrack.track.isInstrumental) {
				count += 1;
			}

			const disc = discMap.get(albumTrack.discNo)!;
			totalDurationMs += albumTrack.track.durationMs;
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
				const artistInfo = Artist.parse({
					id: trackArtist.artist.id.toString(),
					name: trackArtist.artist.name,
					language: null,
					image: null,
					artistType: trackArtist.artist.artistType as string,
					createdAt: trackArtist.artist.createdAt.toISOString(),
					updatedAt: trackArtist.artist.updatedAt.toISOString(),
				});
				if (!artistsMap.has(artistInfo.id)) {
					artistsMap.set(artistInfo.id, artistInfo);
				}
				track.artists.push(artistInfo);
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
			image: null,
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
			artists: Array.from(artistsMap.values()),
			totalDurationMs,
			musicbrainzId: album.musicbrainzAlbumId || null,
			hasInstrumental:
				count < (await album.albumTracksCollection.loadCount()),
			totalTracks: count,
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
