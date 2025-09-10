import { Albums } from '#database/entities/albums.js';
import { AlbumTracks } from '#database/entities/albumTracks.js';
import { Artists, ArtistsArtistType } from '#database/entities/artists.js';
import { Attachments } from '#database/entities/attachments.js';
import { TrackArtists } from '#database/entities/trackArtists.js';
import { Tracks } from '#database/entities/tracks.js';
import { UploadMusicInitDTO } from '#types/dto/music.dto.js';
import { saveCoverImage } from '#utils/upload/local.js';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { UploadMusicInitResponse } from '@music/api/dto/music.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import {
	FileUploadStatus,
	TrackQuality,
} from '#database/entities/trackQuality.js';

@Injectable()
export class MusicService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly storageService: StorageService,
		private readonly config: ConfigService,
	) {}

	async uploadMusicInit(
		AlbumMetadatas: UploadMusicInitDTO,
	): Promise<UploadMusicInitResponse[]> {
		const results: UploadMusicInitResponse[] = [];
		for (const albumMetadata of AlbumMetadatas) {
			await this.em.transactional(async (tem) => {
				let albumArtist = await tem.findOne(Artists, {
					name: albumMetadata.albumArtist,
				});
				if (!albumArtist) {
					const newArtist = tem.create(Artists, {
						name: albumMetadata.albumArtist,
						artistType: ArtistsArtistType.PERSON,
					});
					await this.em.persistAndFlush(newArtist);
					albumArtist = newArtist;
				}

				let album = await this.em.findOne(Albums, {
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

						//the format only image/jpeg or image/png
						saveCoverImage(
							path.join(
								this.config.get('app.storage.library_dir')!,
								'attachments',
								'coverImages',
							),
							newAttachment.id,
							buffer,
							coverImage.format === 'image/jpeg' ? 'jpg' : 'png',
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

						const track = tem.create(Tracks, {
							name: music.title,
							durationMs: music.duration,
							isInstrumental: music.isInstrumental,
						});
						await tem.persistAndFlush(track);

						const quality = tem.create(TrackQuality, {
							hash: music.hash,
							bitrate: music.bitsPerSample,
							sampleRate: music.sampleRate,
							fileContainer: music.format.container.toLowerCase(),
							fileCodec: music.format.codec.toLowerCase(),
							islossless: music.format.lossless,
							type: 'original',
							track: track,
							uploadStatus: FileUploadStatus.PENDING,
							uploadHashCheck: music.uploadHashCheck,
						});
						await tem.persistAndFlush(quality);

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
									artistType: ArtistsArtistType.PERSON,
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

							results.push({
								trackHash: music.hash,
								storedTrackID: track.id.toString(),
								uploadUrl:
									await this.storageService.createPresignedMusicUploadUrl(
										album.id.toString(),
										track.id.toString(),
									),
							});
						}
					}
				}
			});
		}

		return results;
	}
}
