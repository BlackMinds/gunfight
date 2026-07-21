export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/styles/main.css'],
  nitro: {
    preset: 'vercel'
  },
  compatibilityDate: '2026-07-05',
  typescript: {
    strict: true,
    typeCheck: false
  },
  vite: {
    build: {
      // Three.js 角色预览仅在基地异步加载；其延迟块约 637 kB（gzip 165 kB）。
      chunkSizeWarningLimit: 700
    }
  },
  app: {
    head: {
      title: '枪火放置',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }
      ]
    }
  }
})
