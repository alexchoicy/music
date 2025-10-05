import type { JWTCustomPayloadUserInfo } from "@music/api/dto/auth.dto";
import { useAuthUser } from "~/composables/useAuthUser";

function isPublicRoute(to: ReturnType<typeof useRoute>) {
  if (to.path === "/auth/login") {
    const authUser = useAuthUser();
    const event = useRequestEvent();
    const user = event?.context?.user ?? null;
    authUser.value = user;
  }

  if (to.meta.public === true) return true;
  return false;
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicRoute(to)) return;

  const authUser = useAuthUser();

  if (import.meta.server) {
    const event = useRequestEvent();
    const user = event?.context?.user ?? null;
    authUser.value = user;
    if (!user) {
      return navigateTo("/auth/login");
    }
    return;
  }

  try {
    const { authenticated, user } = await $fetch<{
      authenticated: boolean;
      user?: JWTCustomPayloadUserInfo;
    }>("/api/auth/session", { credentials: "include" });

    if (!authenticated) {
      authUser.value = null;
      return navigateTo("/auth/login");
    }

    authUser.value = user ?? null;
  } catch {
    authUser.value = null;
    return navigateTo("/auth/login");
  }
});
