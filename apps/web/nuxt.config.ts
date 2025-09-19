// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  vite: {
    ssr: { noExternal: ["vue"] },
  },
  nitro: {
    externals: { inline: ["vue"] },
  },
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  runtimeConfig: {
    JWKS_URL: process.env.NUXT_JWKS_URL,
    public: {
      apiBase: "",
    },
  },

  extends: ["@music/ui"],
  modules: [],
});
