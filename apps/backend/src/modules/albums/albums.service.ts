import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Albums } from '#database/entities/albums.js';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import { AlbumDetailDTO } from '#types/dto/music.dto.js';
import {
	AlbumResponse,
	Artist,
	ArtistSchema,
	Track,
	TrackSchema,
} from '@music/api/dto/album.dto';
import mime from 'mime';
import { AlbumTracks } from '#database/entities/albumTracks.js';
import { getMusicExt } from '@music/api/lib/musicUtil';
import pLimit from 'p-limit';

@Injectable()
export class AlbumsService {
	constructor(
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}

	private async getCoverDataUrl(id: string, fileType?: string | null) {
		if (!fileType) return null;
		const ext = mime.getExtension(fileType) || '';
		return this.storageService.staticContent.getAlbumCoverDataUrl(id, ext);
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

	async getAlbums(): Promise<AlbumResponse[]> {
		const albums = await this.em.find(
			Albums,
			{},
			{
				populate: ['mainArtist', 'coverAttachment'],
				orderBy: { id: 'DESC', createdAt: 'DESC' },
			},
		);
		const limit = pLimit(10);

		const promises = albums.map((album) =>
			limit(() => this.getAlbumInfo(album)),
		);

		const results = await Promise.all(promises);
		return results.filter((r): r is AlbumResponse => r !== null);
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
				orderBy: {
					albumTracksCollection: { discNo: 'ASC', trackNo: 'ASC' },
				},
			},
		);

		if (!album) {
			throw new NotFoundException('Album not found');
		}

		let totalDurationMs = 0;

		const artistsMap = new Map<string, ArtistSchema>();

		const discMap = new Map<number, TrackSchema[]>();

		let totalTrackCount = 0;

		const [cover, stats] = await Promise.all([
			album.coverAttachment
				? this.getCoverDataUrl(
						album.coverAttachment.id,
						album.coverAttachment.fileType,
					)
				: Promise.resolve(null),
			this.getAlbumStats(album),
		]);

		for (const albumTrack of album.albumTracksCollection) {
			if (!discMap.has(albumTrack.discNo)) {
				discMap.set(albumTrack.discNo, []);
			}

			const disc = discMap.get(albumTrack.discNo)!;
			totalDurationMs += albumTrack.track.durationMs;
			const track = Track.parse({
				id: albumTrack.track.id.toString(),
				index: totalTrackCount,
				name: albumTrack.track.name,
				trackNo: albumTrack.trackNo,
				durationMs: albumTrack.track.durationMs,
				isInstrumental: albumTrack.track.isInstrumental,
				isMC: albumTrack.track.isMC,
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
					url: await this.storageService.audio.getMusicDataUrl(
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
			totalTrackCount += 1;
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
			hasInstrumental: stats.hasInstrumental,
			totalTracks: stats.totalTracks,
			cover: cover,
			Disc: Array.from(discMap.entries()).map(([discNo, tracks]) => ({
				discNo,
				tracks,
			})),
			createdAt: album.createdAt.toISOString(),
			updatedAt: album.updatedAt.toISOString(),
			mainArtist: mainArtist,
		});

		return result;
	}
}
