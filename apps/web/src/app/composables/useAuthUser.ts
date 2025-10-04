import type { JWTCustomPayloadUserInfo } from "@music/api/dto/auth.dto";

export function useAuthUser() {
  return useState<JWTCustomPayloadUserInfo | null>("auth-user", () => null);
}
