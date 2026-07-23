import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Project is served from https://enzofeltri-sys.github.io/RPG-/ on GitHub Pages.
const base = '/RPG-/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Le Sceau de Vaeloria',
        short_name: 'Vaeloria',
        description: 'RPG solo médiéval-fantastique en tour par tour, jouable hors-ligne.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0c10',
        theme_color: '#0b0c10',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
