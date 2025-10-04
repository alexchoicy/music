import { createZodDto } from 'nestjs-zod';
import { UploadMusicInitSchema } from '@music/api/dto/music.dto';
import { AlbumDetailResponseSchema } from '@music/api/dto/album.dto';
import {
	artistSchema,
	ArtistRelationshipSchema,
} from '@music/api/dto/artist.dto';

export class UploadMusicInitDTO extends createZodDto(UploadMusicInitSchema) {}

export class AlbumDetailDTO extends createZodDto(AlbumDetailResponseSchema) {}

export class ArtistDetailDTO extends createZodDto(artistSchema) {}

export class ArtistRelationshipDTO extends createZodDto(
	ArtistRelationshipSchema,
) {}
