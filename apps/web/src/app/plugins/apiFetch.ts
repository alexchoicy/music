export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const headers = useRequestHeaders(["cookie"]);
  const backend = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: "include",
    headers,

    onResponseError({ response }) {
      throw createError({
        statusCode: response.status,
        statusMessage: response._data.message,
      });
    },
  });

  return {
    provide: {
      backend,
    },
  };
});
