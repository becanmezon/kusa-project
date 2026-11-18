/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { flushOutbox, OUTBOX_SYNC_TAG } from './lib/outbox'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// 新しいSWをインストール直後に即時アクティベート（古いSWを待機させない）
self.addEventListener('install', () => self.skipWaiting())
clientsClaim()

// ─── 静的ファイル（HTML・JS・CSS・アイコン）：ビルド時にまとめて保存（プリキャッシュ） ───
// 分割した画面のファイルもすべて含まれるので、オフラインでもどの画面も開ける
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/rest\//, /^\/auth\//],
  })
)

// ─── データ（Supabase の REST API の読み込み）：Network First ───────────────
// まずサーバーに聞き、4秒で返事がなければ（＝電波が悪い）保存しておいた前回の結果を使う。
// 日付が変わってURLが変わったときでも、同じ表の最新の保存結果を代わりに返す。
const API_CACHE = 'kusa-api'
const fallbackToSameTable = {
  handlerDidError: async ({ request }: { request: Request }) => {
    const cache = await caches.open(API_CACHE)
    const path = new URL(request.url).pathname
    const keys = (await cache.keys()).filter(k => new URL(k.url).pathname === path)
    const latest = keys[keys.length - 1]
    return latest ? (await cache.match(latest)) ?? undefined : undefined
  },
}
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 14 * 24 * 60 * 60 }),
      fallbackToSameTable,
    ],
  }),
)

// ─── 投稿の画像（Supabase Storage）：Cache First ─────────────────────────
// 画像は一度アップロードしたら中身が変わらないので、保存済みならサーバーに聞かずにすぐ表示
registerRoute(
  ({ url }) => url.pathname.startsWith('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'kusa-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  }),
)

// ─── フォント（Google Fonts）：CSS は Stale-While-Revalidate、フォント本体は Cache First ───
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
)

// ─── オフライン中の水やり記録の送信（Background Sync） ─────────────────────
// アプリ画面が「つながったら送って」と予約しておくと、電波が戻ったときに
// アプリを閉じていてもブラウザがここを呼んでくれる（Chrome / Android など対応ブラウザ）
async function flushAndNotify() {
  const result = await flushOutbox()
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const c of clients) c.postMessage({ type: 'kusa-outbox-flushed', ...result })
  // まだ残っていれば（電波がまた切れたなど）失敗扱いにして、ブラウザにもう一度試してもらう
  if (result.remaining > 0) throw new Error('outbox not empty')
}

self.addEventListener('sync', (event: Event) => {
  const e = event as Event & { tag: string; waitUntil(p: Promise<unknown>): void }
  if (e.tag === OUTBOX_SYNC_TAG) e.waitUntil(flushAndNotify())
})

// アプリ画面から「今すぐ送って」と頼まれたとき（Background Sync 非対応のブラウザ向けの保険）
self.addEventListener('message', event => {
  if (event.data?.type === 'kusa-outbox-flush') event.waitUntil(flushAndNotify().catch(() => {}))
})

// ─── プッシュ通知 ──────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? '草プロジェクト', {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
