import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  telemetry: true,

  runtimeConfig: {
    JWKS_URL: process.env.NUXT_JWKS_URL,
    public: {
      apiBase: "",
    },
  },

  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },

  extends: [],
  modules: ["shadcn-nuxt"],
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
