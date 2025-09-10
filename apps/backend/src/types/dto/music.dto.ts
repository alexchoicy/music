import { createZodDto } from 'nestjs-zod';
import { UploadMusicInitSchema } from '@music/api/dto/music.dto';
import { AlbumDetailResponseSchema } from '@music/api/dto/album.dto';


export class UploadMusicInitDTO extends createZodDto(UploadMusicInitSchema) { }

export class AlbumDetailDTO extends createZodDto(AlbumDetailResponseSchema) { }