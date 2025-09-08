import { createZodDto } from 'nestjs-zod';
import { UploadMusicInitSchema } from '@music/api/dto/music.dto';

export class UploadMusicInitDTO extends createZodDto(UploadMusicInitSchema) {}
