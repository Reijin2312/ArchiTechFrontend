import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

const outDir = 'dist'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    https: {
    key: fs.readFileSync('./certs/localhost-key.pem'),
    cert: fs.readFileSync('./certs/localhost.pem'),
    },
    proxy: {
      '/api': { target: 'http://localhost:51788', changeOrigin: true },
      "/media": { target: "http://localhost:51788", changeOrigin: true },
      // Proxy WebSocket through dev server to avoid mixed-content issues (frontend https, backend ws)
      '/ws': { target: 'http://localhost:51789', ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    assetsDir: 'assets'
  }
})
