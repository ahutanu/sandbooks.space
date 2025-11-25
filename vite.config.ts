import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to replace HTML placeholders with environment variables
function htmlEnvReplace(mode: string): Plugin {
  return {
    name: 'html-env-replace',
    enforce: 'pre', // Run before Vite's built-in HTML processing
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        // Load env variables using Vite's loadEnv (scoped by mode)
        const env = loadEnv(mode, process.cwd(), '')
        const gtmId = env.VITE_GOOGLE_TAG_MANAGER_TAG || ''
        return html.replace(/%VITE_GOOGLE_TAG_MANAGER_TAG%/g, gtmId)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    htmlEnvReplace(mode),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Sandbooks',
        short_name: 'Sandbooks',
        description: 'Executable Notes for Developers',
        theme_color: '#1C1917',
        background_color: '#1C1917',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB (for large images)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\/api\/health$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-health-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/execute$/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-execute-cache',
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // Enable in dev for manifest and install prompt testing
        type: 'module', // Use module type for better dev experience
      },
    }),
  ],
  define: {
    global: 'globalThis',
  },
}))
