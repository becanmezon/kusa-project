import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service Workerを自動登録・自動更新する
      workbox: {
        // キャッシュ対象：JS/CSS/HTML/画像/フォント
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Supabaseへのリクエストはキャッシュしない（常に最新データを取得）
        navigateFallbackDenylist: [/^\/api/, /^\/rest/, /^\/auth/],
      },
      manifest: {
        name: '草プロジェクト',
        short_name: '草PJ',
        description: '水やり管理アプリ - バイト仲間と野菜を育てよう',
        lang: 'ja',
        theme_color: '#2C2317',
        background_color: '#F6F3E9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png',           sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',          sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',          sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
