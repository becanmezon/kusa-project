import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export async function isSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub !== null
  } catch {
    return false
  }
}

export type SubscribeResult = 'ok' | 'permission_denied' | 'no_vapid_key' | 'subscription_failed'

export async function subscribePush(userName: string): Promise<SubscribeResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'subscription_failed'
  }

  // VAPID公開鍵がビルドに埋め込まれているか確認
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'undefined') {
    console.error('[push] VITE_VAPID_PUBLIC_KEY が設定されていません')
    return 'no_vapid_key'
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'permission_denied'

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const subJson = sub.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_name: userName, endpoint: subJson.endpoint, subscription: subJson },
      { onConflict: 'endpoint' }
    )
    if (error) throw error

    return 'ok'
  } catch (err) {
    console.error('[push] subscribe error:', err)
    return 'subscription_failed'
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const { endpoint } = sub
    await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  } catch (err) {
    console.error('unsubscribePush:', err)
  }
}

export async function sendTestNotification(userName: string): Promise<void> {
  const res = await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_name: userName, title: '草プロジェクト', body: 'テスト通知です！🌱' }),
  })
  if (!res.ok) throw new Error(await res.text())
}
