export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const backend = $fetch.create({
    baseURL: config.public.apiBase,
  });

  return {
    provide: {
      backend,
    },
  };
});
