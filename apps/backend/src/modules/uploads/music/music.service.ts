import { Albums } from '#database/entities/albums.js';
import { AlbumTracks } from '#database/entities/albumTracks.js';
import { Artists } from '#database/entities/artists.js';
import { Attachments } from '#database/entities/attachments.js';
import { TrackArtists } from '#database/entities/trackArtists.js';
import { Tracks } from '#database/entities/tracks.js';
import { UploadMusicInitDTO } from '#types/dto/music.dto.js';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { UploadMusicInitResponse } from '@music/api/dto/upload.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../storageServices/storageServiceAbstract.js';
import {
	FileUploadStatus,
	TrackQuality,
} from '#database/entities/trackQuality.js';
import mime from 'mime';
import { UploadAlbum, UploadDisc, UploadMusic } from '@music/api/type/music';

@Injectable()
export class MusicService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
		private readonly config: ConfigService,
	) {}

	async getOrCreateArtistByname(
		tem: EntityManager,
		name: string,
		uploadMusicInit: UploadAlbum,
	) {
		let albumArtist = await tem.findOne(Artists, {
			name: name,
		});
		if (!albumArtist) {
			const newArtist = tem.create(Artists, {
				name: name,
				artistType: uploadMusicInit.artistsType || 'person',
			});
			await tem.persistAndFlush(newArtist);
			albumArtist = newArtist;
		}
		return albumArtist;
	}

	async getOrCreateAlbum(
		tem: EntityManager,
		albumArtist: Artists,
		albumMetadata: UploadAlbum,
	) {
		let album = await tem.findOne(Albums, {
			name: albumMetadata.name,
			mainArtist: albumArtist,
		});

		if (!album) {
			const coverImage =
				albumMetadata.disc?.[0]?.musics?.[0]?.picture?.[0];
			let attachment: Attachments | null = null;
			if (coverImage) {
				const newAttachment = tem.create(Attachments, {
					entityType: 'coverImage',
					fileType: coverImage.format,
				});

				const buffer = Buffer.from(coverImage.data, 'base64');

				this.storageService.staticContent.saveCoverImage(
					newAttachment.id.toString(),
					buffer,
					mime.getExtension(coverImage.format) || 'jpg',
				);

				await tem.persistAndFlush(newAttachment);
				attachment = newAttachment;
			}
			const newAlbum = tem.create(Albums, {
				name: albumMetadata.name,
				mainArtist: albumArtist,
				year: albumMetadata.disc?.[0]?.musics?.[0]?.year ?? 0,
				albumType: albumMetadata.albumType,
				coverAttachment: attachment,
			});
			await tem.persistAndFlush(newAlbum);
			album = newAlbum;
		}
		return album;
	}

	async createNewTrack(
		tem: EntityManager,
		disc: UploadDisc,
		music: UploadMusic,
	) {
		const track = tem.create(Tracks, {
			name: music.title,
			durationMs: music.duration * 1000,
			isInstrumental: music.isInstrumental,
			isMC: music.isMC,
		});
		await tem.persistAndFlush(track);

		const quality = tem.create(TrackQuality, {
			hash: music.hash,
			bitrate: music.bitsPerSample,
			sampleRate: music.sampleRate,
			fileContainer: music.format.container.toLowerCase(),
			fileCodec: music.format.codec.toLowerCase(),
			islossless: music.format.lossless,
			type: music.format.lossless ? 'original' : 'transcoded',
			track: track,
			uploadStatus: FileUploadStatus.PENDING,
			uploadHashCheck: music.uploadHashCheck,
		});
		await tem.persistAndFlush(quality);
		return track;
	}

	async uploadMusicInit(
		AlbumMetadatas: UploadMusicInitDTO,
	): Promise<UploadMusicInitResponse[]> {
		const results: UploadMusicInitResponse[] = [];
		for (const albumMetadata of AlbumMetadatas) {
			await this.em.transactional(async (tem) => {
				const albumArtist = await this.getOrCreateArtistByname(
					tem,
					albumMetadata.albumArtist,
					albumMetadata,
				);

				const album = await this.getOrCreateAlbum(
					tem,
					albumArtist,
					albumMetadata,
				);

				for (const disc of albumMetadata.disc) {
					for (const music of disc.musics) {
						const existingTrack = await tem.findOne(
							TrackQuality,
							{
								hash: music.hash,
							},
							{ populate: ['track'] },
						);
						if (existingTrack) {
							continue;
						}

						const track = await this.createNewTrack(
							tem,
							disc,
							music,
						);

						const albumTrack = tem.create(AlbumTracks, {
							album: album,
							track: track,
							discNo: disc.no,
							trackNo: music.track.no,
						});
						await tem.persistAndFlush(albumTrack);

						for (const artist of music.artists) {
							let trackArtist = await tem.findOne(Artists, {
								name: artist,
							});
							if (!trackArtist) {
								const newArtist = tem.create(Artists, {
									name: artist,
									artistType: 'person',
								});
								await tem.persistAndFlush(newArtist);
								trackArtist = newArtist;
							}

							const newTrackArtistLink = tem.create(
								TrackArtists,
								{
									track: track,
									artist: trackArtist,
								},
							);

							await tem.persistAndFlush(newTrackArtistLink);
						}

						results.push({
							trackHash: music.hash,
							storedTrackID: track.id.toString(),
							uploadUrl:
								await this.storageService.audio.createPresignedMusicUploadUrl(
									album.id.toString(),
									track.id.toString(),
								),
						});
					}
				}
			});
		}

		return results;
	}
}
