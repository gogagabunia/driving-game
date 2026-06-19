import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@babylonjs')) return 'babylon';
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
            if (id.includes('i18next')) return 'i18n';
            return 'vendor';
          }
        }
      }
    }
  }
})
