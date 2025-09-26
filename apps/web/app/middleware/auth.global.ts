import type { JWTCustomPayload } from "@music/api/dto/auth.dto";

function isPublicRoute(to: ReturnType<typeof useRoute>) {
  if (to.meta.public === true) return true;
  return false;
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicRoute(to)) return;

  console.log("Auth middleware triggered for:", to.fullPath);

  if (import.meta.server) {
    const event = useRequestEvent();
    if (!event?.context?.user) {
      return navigateTo("/auth/login");
    }
    return;
  }

  // Client: fallback probe
  try {
    const { authenticated, user } = await $fetch<{
      authenticated: boolean;
      user?: JWTCustomPayload;
    }>("/api/auth/session", { credentials: "include" });
    if (!authenticated) return navigateTo("/auth/login");
  } catch {
    return navigateTo("/auth/login");
  }
});
