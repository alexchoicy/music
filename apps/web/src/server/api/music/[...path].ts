export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const path = event.context.params?.path
    ? `/${event.context.params.path}`
    : "/";

  const authHeader: Record<string, string> = {
    authorization: `Bearer ${config.BACKEND_TOKEN}`,
  };

  const cookieHeader = getRequestHeader(event, "cookie");
  if (cookieHeader) {
    authHeader["cookie"] = cookieHeader;
  }

  const data = await $fetch(path, {
    baseURL: config.public.apiBase,
    headers: authHeader,
    credentials: "include",
  });
  return data;
});
