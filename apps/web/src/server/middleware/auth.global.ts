import type { H3Event } from "h3";
import { getCookie } from "h3";
import { verifyJWKS } from "../utils/verify_jwks";

export default defineEventHandler(async (event: H3Event) => {
  try {
    const token = await getCookie(event, "music_auth_token");

    if (!token) return;

    const user = await verifyJWKS(token);
    event.context.user = user;
  } catch {
    /* empty */
  }
});
