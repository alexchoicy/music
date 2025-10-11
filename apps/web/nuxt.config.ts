import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  telemetry: true,

  runtimeConfig: {
    JWKS_URL: process.env.NUXT_JWKS_URL,
    //used for openGraph or things
    public: {
      WS_URL: "",
      apiBase: "",
    },
  },

  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },

  extends: [],
  modules: ["shadcn-nuxt", "@pinia/nuxt"],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "@/components/ui",
  },

  srcDir: "src/app",
  serverDir: "src/server",
  dir: {
    public: "src/public",
  },
});
