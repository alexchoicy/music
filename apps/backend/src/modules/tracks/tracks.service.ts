import { AlbumTracks } from '#database/entities/albumTracks.js';
import { Tracks } from '#database/entities/tracks.js';
import { StorageService } from '#modules/storageServices/storageServiceAbstract.js';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import mime from 'mime';

@Injectable()
export class TracksService {
	constructor(
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
	) {}
	private async getCoverDataUrl(id: string, fileType?: string | null) {
		if (!fileType) return null;
		const ext = mime.getExtension(fileType) || '';
		return this.storageService.staticContent.getAlbumCoverDataUrl(id, ext);
	}
	async getTrack(id: string) {
		const track = await this.em.findOne(
			Tracks,
			{ id },
			{
				populate: [
					'trackArtistsCollection',
					'trackArtistsCollection.artist',
					'albumTracksCollection',
					'albumTracksCollection.album',
					'albumTracksCollection.album.coverAttachment',
				],
				orderBy: {
					albumTracksCollection: { discNo: 'ASC', trackNo: 'ASC' },
				},
			},
		);

		if (!track) {
			throw new NotFoundException('Track not found');
		}

		const albumTracks = track.albumTracksCollection.getItems();

		const primaryAlbumTrack = albumTracks[0];

		const album = primaryAlbumTrack?.album ?? null;

		const [cover, totalTracks] = await Promise.all([
			album?.coverAttachment
				? this.getCoverDataUrl(
						album.coverAttachment.id,
						album.coverAttachment.fileType,
					)
				: Promise.resolve(null),
			album
				? this.em.count(AlbumTracks, { album: album.id })
				: Promise.resolve(null),
		]);

		const artists = track.trackArtistsCollection
			.getItems()
			.map((trackArtist) => trackArtist.artist?.name)
			.filter((name): name is string => Boolean(name));

		const uniqueArtists = Array.from(new Set(artists));

		const summary = {
			trackID: track.id.toString(),
			cover,
			albumName: album?.name ?? null,
			artists: uniqueArtists,
			trackName: track.name,
			trackNo: primaryAlbumTrack?.trackNo ?? null,
			noOfTracks: totalTracks,
			duration: track.durationMs ?? 0,
		};

		return summary;
	}
}
