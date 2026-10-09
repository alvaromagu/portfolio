import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { locales } from './src/i18n/i18n.ts'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  i18n: {
    locales,
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: false
    }
  }
})
