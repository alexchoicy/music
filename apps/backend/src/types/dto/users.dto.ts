import { createZodDto } from 'nestjs-zod';
import { createUserRequestSchema } from '@music/api/dto/users.dto';

export class CreateUserRequestDTO extends createZodDto(
	createUserRequestSchema,
) {}
