import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: '/Mobile_PWA/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
      },
      manifest: {
        name: 'Nirco Japan Trip',
        short_name: 'Nirco PWA',
        description: 'Offline-first Japan travel companion',
        theme_color: '#38bdf8',
        background_color: '#38bdf8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Mobile_PWA/',
        scope: '/Mobile_PWA/',
        icons: [
          {
            src: '/Mobile_PWA/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/Mobile_PWA/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/Mobile_PWA/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        share_target: {
          action: '/Mobile_PWA/share-target',
          method: 'GET',
          params: {
            url: 'url',
            text: 'text',
            title: 'title',
          },
        },
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
