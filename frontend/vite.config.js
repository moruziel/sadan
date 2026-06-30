import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 — required for phones on the LAN/tunnel to reach this dev server
    // Vite blocks unrecognized Host headers by default (CVE-2023-... style DNS-rebind protection).
    // Quick Cloudflare tunnels get a random *.trycloudflare.com subdomain each run — allow the suffix.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/gemini-voice': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      '/wa': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/wa/, ''),
      },
    },
  },
})
