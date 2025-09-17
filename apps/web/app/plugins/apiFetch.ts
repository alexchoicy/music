export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const backend = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: "include",
  });

  return {
    provide: {
      backend,
    },
  };
});
