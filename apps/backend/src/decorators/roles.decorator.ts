import { UserRole } from '@music/api/dto/auth.dto';
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<UserRole[]>();
