import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

const outDir = 'dist'
const apiUrl = process.env.VITE_API_PROXY_TARGET || 'http://localhost:51788'

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind explicitly to IPv4. On Windows, `localhost` can resolve to ::1,
    // which leaves the dev server unreachable for IPv4-only clients/webviews.
    host: '127.0.0.1',
    port: 5173,
    //https: {
    //key: fs.readFileSync('./certs/localhost-key.pem'),
    //cert: fs.readFileSync('./certs/localhost.pem'),
    //},
    proxy: {
      '/api': { target: apiUrl, changeOrigin: true },
      "/media": { target: apiUrl, changeOrigin: true },
      '/ws': { target: apiUrl, ws: true, changeOrigin: true },
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
