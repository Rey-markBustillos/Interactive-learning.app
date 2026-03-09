import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['school-bg.jpg'],
      manifest: {
        name: 'Scan-to-Track Attendance System',
        short_name: 'Scan-to-Track',
        description: 'Smart attendance tracking system using School ID, LRN, or Name',
        theme_color: '#8B1A1A',
        background_color: '#8B1A1A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpg,png,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:5000\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['xlsx-js-style'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})
