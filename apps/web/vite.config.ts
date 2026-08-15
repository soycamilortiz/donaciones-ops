import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'SOS Chocó — Logística humanitaria',
        short_name: 'SOS Chocó',
        description:
          'Registro de donaciones, centros de acopio y envíos para zonas remotas del Chocó.',
        lang: 'es-CO',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3efe6',
        theme_color: '#1c241c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El shell se sirve desde caché para que la app abra sin señal, que es
        // la situación normal en campo.
        navigateFallback: '/index.html',
        // Las rutas del API nunca deben caer al shell.
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Las fotos del Blob son inmutables: una vez vistas sirven de caché.
            urlPattern: /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-donaciones',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // El API se consulta primero a la red porque los estados cambian;
            // la caché es solo respaldo de lectura cuando no hay señal.
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-lecturas',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        // Sin esto no hay service worker en `pnpm dev` y el comportamiento
        // offline solo se puede probar compilando.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api': process.env.API_PROXY || 'http://localhost:3000',
    },
  },
});
