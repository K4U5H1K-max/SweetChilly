import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-32x32.png',
        'favicon-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon-180x180.png',
        'icons/brahmaputra-192.png',
        'icons/brahmaputra-512.png',
        'icons/brahmaputra-maskable-192.png',
        'icons/brahmaputra-maskable-512.png',
        'assets/brahmaputra_emblem.png',
        'assets/brahmaputra_hero.jpg',
      ],
      manifest: {
        name: 'Project Brahmaputra — NER Smart Logistics',
        short_name: 'Brahmaputra',
        description: 'AI-Based Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region',
        theme_color: '#0F172A',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/brahmaputra-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/brahmaputra-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/brahmaputra-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/brahmaputra-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['logistics', 'navigation', 'government', 'productivity'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2}'],
        runtimeCaching: [
          {
            // Strictly Network Only for all API calls to prevent stale operational data
            urlPattern: /^\/api\/.*$/,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'ner-api-queue',
                options: {
                  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours
                },
              },
            },
          },
          {
            // Cache Google Fonts Stylesheets with Stale-While-Revalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts Webfonts with Cache-First
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
