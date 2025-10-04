import { z } from "zod/v4";

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const UserRolesSchema = z.enum(["user", "admin"]);

export type UserRole = z.infer<typeof UserRolesSchema>;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface JWTCustomPayload {
  type: "access" | "refresh" | "api";
  info: JWTCustomPayloadUserInfo;
}

export interface JWTCustomPayloadUserInfo {
  uid: string;
  role?: UserRole;
}
