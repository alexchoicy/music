import { createZodDto } from 'nestjs-zod';
import { LoginRequestSchema } from '@music/api/dto/auth.dto';

export class LoginRequestDTO extends createZodDto(LoginRequestSchema) {}
