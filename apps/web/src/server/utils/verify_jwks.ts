import type { JWTCustomPayload } from "@music/api/dto/auth.dto";
import type { JWTPayload } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(process.env.NUXT_JWKS_URL!));

export async function verifyJWKS(token: string) {
  const { payload } = await jwtVerify(token, jwks);
  return payload as JWTPayload & JWTCustomPayload;
}
