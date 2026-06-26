import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project pages are served from /RepoName/ (e.g. /PrimeSpace/)
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/health': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/live': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/ready': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/skill.md': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/skill': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/docs': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/claim': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true
      },
      '/ws': {
        target: `ws://localhost:${process.env.BACKEND_PORT || 3000}`,
        ws: true
      }
    }
  }
})
