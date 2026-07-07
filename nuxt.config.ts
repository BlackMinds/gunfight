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
