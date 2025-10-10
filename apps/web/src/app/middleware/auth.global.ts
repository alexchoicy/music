import type { JWTCustomPayloadUserInfo } from "@music/api/dto/auth.dto";
import { useAuthUser } from "~/composables/useAuthUser";

function isPublicRoute(to: ReturnType<typeof useRoute>) {
  if (to.path === "/auth/login") {
    const authUser = useAuthUser();
    const event = useRequestEvent();
    const user = event?.context?.user ?? null;
    authUser.value = user;
  }

  return to.meta.public === true;
}

function isBotAgent(userAgent: string) {
  const botUserAgents = ["Discordbot"];
  return botUserAgents.some((botAgent) => userAgent.includes(botAgent));
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicRoute(to)) return;
  const event = useRequestEvent();

  const userAgent =
    event?.headers.get("user-agent") ||
    event?.node.req.headers["user-agent"] ||
    "";
  console.log("User-Agent:", userAgent);

  const isBot = useIsBot();

  if (isBotAgent(userAgent) && to.meta.bot === true) {
    isBot.value = true;
    return;
  }

  const authUser = useAuthUser();

  if (import.meta.server) {
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
