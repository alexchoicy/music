export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const headers = useRequestHeaders(["cookie"]);
  const backend = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: "include",
    headers,
  });

  return {
    provide: {
      backend,
    },
  };
});
