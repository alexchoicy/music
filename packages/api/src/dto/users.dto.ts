import { z } from "zod/v4";
import { UserRole, UserRolesSchema } from "./auth.dto.js";

export const createUserRequestSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string(),
  role: UserRolesSchema,
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export interface UsersInfoDTO {
  id: string;
  username: string;
  displayname: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
