// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  
  srcDir: 'app/',
  serverDir: 'app/server',
  
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  
  css: ['~/styles/main.css'],
  
  runtimeConfig: {
    storagePath: './storage',
    databaseUrl: './data/flow-music.db',
    jwtSecret: '',
    public: {
      appName: 'Flow Music',
      version: '1.0.0'
    }
  },
  
  nitro: {
    preset: 'node-server',
    prerender: {
      crawlLinks: true,
      routes: ['/']
    },
    storage: {
      data: { driver: 'fs', base: './data' },
      storage: { driver: 'fs', base: './storage' }
    },
    routeRules: {
      '/api/**': { cors: true }
    }
  },
  
  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'lucide-vue-next',
        'howler',
      ]
    },
    ssr: {
      noExternal: ['@applemusic-like-lyrics/vue']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'audio-player': ['howler'],
            'vendor': ['vue', 'vue-router', 'pinia']
          }
        }
      }
    }
  }
})