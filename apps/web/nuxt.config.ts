import { resolve } from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ["@music/ui"],
  vite: {
    server: {
      watch: {
        // Explicitly include workspace packages for watching
        usePolling: false,
        ignored: (path: string) => {
          // Don't ignore packages directory to enable HMR
          if (path.includes('/packages/')) return false
          // Don't ignore our workspace packages in node_modules
          if (path.includes('/node_modules/@music/')) return false
          // Default behavior for other paths
          return /node_modules/.test(path)
        }
      },
      fs: {
        allow: ['..', '../..']
      }
    },
    optimizeDeps: {
      exclude: ['@music/ui']
    }
  }
})
