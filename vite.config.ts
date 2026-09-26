import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages (project site) 기준: https://WBmaker2.github.io/skeleton-versus/
  // 루트 호스팅 시에는 '/'로 되돌릴 것.
  base: '/skeleton-versus/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // pose engines (tfjs/mediapipe) push the bundle past
      // workbox's 2 MiB default precache limit — raise it.
      // Self-hosted pose models (json/bin/task) are precached too,
      // so the games work offline after the first visit.
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,json,bin,task,webmanifest}']
      },
      manifest: {
        name: 'Skeleton Versus - 2인 대전',
        short_name: 'SkelVersus',
        start_url: '.',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
