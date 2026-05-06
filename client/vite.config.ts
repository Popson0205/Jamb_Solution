import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'JAMB CBT Centre Allocator',
        short_name: 'JAMB CBT',
        description: 'Find your nearest JAMB CBT exam centre instantly',
        theme_color: '#006400',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\/api\/student\/allocation/,
          handler: 'CacheFirst',
          options: { cacheName: 'allocation-cache', expiration: { maxEntries: 10, maxAgeSeconds: 86400 } }
        }]
      }
    })
  ],
  server: { proxy: { '/api': 'http://localhost:3001' } }
});
