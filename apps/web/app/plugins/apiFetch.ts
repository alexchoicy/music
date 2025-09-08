export default defineNuxtPlugin((nuxtApp) => {
  const backend = $fetch.create({
    baseURL: nuxtApp.$config.public.apiBase,
  });

  return {
    provide: {
      backend,
    },
  };
});
