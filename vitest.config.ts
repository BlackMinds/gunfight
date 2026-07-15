import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // Nuxt 与 Vitest 分别携带 Vite 类型实例；运行时插件兼容，在配置边界消除重复类型冲突。
  plugins: [vue() as any],
  resolve: {
    alias: {
      '~': rootDir,
      '@': rootDir
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts']
  }
})
