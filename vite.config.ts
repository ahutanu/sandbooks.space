import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to replace HTML placeholders with environment variables
function htmlEnvReplace(mode: string): Plugin {
  return {
    name: 'html-env-replace',
    transformIndexHtml: {
      order: 'pre', // Run before Vite's built-in HTML processing
      handler(html) {
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
  build: {
    // Chunk size warning threshold set to 750KB
    // Main app chunk is ~700KB which is acceptable for a rich editor app
    // Further optimization would require lazy loading specific features
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom', 'zustand'],
          // TipTap editor (rich text)
          'vendor-tiptap': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/suggestion',
          ],
          // CodeMirror (code editing)
          'vendor-codemirror': [
            '@codemirror/autocomplete',
            '@codemirror/commands',
            '@codemirror/language',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/search',
            '@codemirror/lint',
            '@uiw/react-codemirror',
          ],
          // CodeMirror language modes
          'vendor-codemirror-langs': [
            '@codemirror/lang-javascript',
            '@codemirror/lang-python',
            '@codemirror/lang-json',
            '@codemirror/lang-markdown',
            '@codemirror/lang-html',
            '@codemirror/lang-css',
            '@codemirror/lang-sql',
            '@codemirror/lang-xml',
          ],
          // Terminal emulator
          'vendor-xterm': [
            '@xterm/xterm',
            '@xterm/addon-fit',
            '@xterm/addon-webgl',
            '@xterm/addon-canvas',
            '@xterm/addon-search',
            '@xterm/addon-web-links',
            '@xterm/addon-unicode11',
          ],
          // Syntax highlighting and math
          'vendor-highlight': ['highlight.js', 'lowlight', 'katex'],
          // ProseMirror (editor foundation)
          'vendor-prosemirror': [
            'prosemirror-model',
            'prosemirror-state',
            'prosemirror-view',
            'prosemirror-transform',
            'prosemirror-commands',
            'prosemirror-keymap',
            'prosemirror-history',
            'prosemirror-inputrules',
            'prosemirror-gapcursor',
            'prosemirror-dropcursor',
            'prosemirror-schema-list',
            'prosemirror-markdown',
            'prosemirror-codemirror-block',
          ],
          // UI utilities
          'vendor-ui': ['react-icons', 'clsx', 'date-fns', 'nanoid'],
        },
      },
    },
  },
}))
