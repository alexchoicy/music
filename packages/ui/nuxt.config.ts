import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: [join(currentDir, './assets/css/tailwind.css')],
  alias: {
    '@': currentDir,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: ['shadcn-nuxt', '@nuxtjs/color-mode'],
  shadcn: {
    prefix: '',
    componentDir: join(currentDir, './components/ui')
  },
  colorMode: {
    classSuffix: '',
    preference: 'dark'
  }
})