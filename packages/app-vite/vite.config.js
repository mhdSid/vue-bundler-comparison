import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@monorepo/shared': resolve(__dirname, '../shared/src')
    }
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue'],
          'table-vendor': ['@tanstack/vue-table', 'date-fns']
        }
      }
    }
  }
})
