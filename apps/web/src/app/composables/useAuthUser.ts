import type { JWTCustomPayload } from "@music/api/dto/auth.dto";

export function useAuthUser() {
  return useState<JWTCustomPayload | null>("auth-user", () => null);
}
