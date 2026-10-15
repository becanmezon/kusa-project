// ─── サーバー側のプッシュ送信（api/ の各関数から使う共通処理） ──────
// api/ ディレクトリの外に置いているので、Vercel のエンドポイントにはならない。

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
)

export interface SendResult {
  sent: number
  failed: number
  expired_deleted: number
}

const EMPTY_RESULT: SendResult = { sent: 0, failed: 0, expired_deleted: 0 }

/**
 * 指定した名前のメンバーの購読先すべてに通知を送る。
 * 410/404（購読が無効）が返った endpoint は自動削除する。
 */
export async function sendToUsers(
  userNames: string[],
  title: string,
  body: string,
): Promise<SendResult> {
  if (userNames.length === 0) return { ...EMPTY_RESULT }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .in('user_name', userNames)

  const payload = JSON.stringify({ title, body })

  let sent = 0
  let failed = 0
  const expiredEndpoints: string[] = []

  for (const row of subs ?? []) {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err: unknown) {
      failed++
      const statusCode = (err as { statusCode?: number }).statusCode ?? 0
      console.error('[push] failed statusCode=%d body=%s', statusCode, (err as { body?: string }).body ?? '')
      // 410 Gone / 404 Not Found = 購読が無効（VAPIDキー変更後など）→ 自動削除
      if (statusCode === 410 || statusCode === 404) {
        expiredEndpoints.push(row.endpoint as string)
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    console.log('[push] deleted %d expired subscriptions', expiredEndpoints.length)
  }

  return { sent, failed, expired_deleted: expiredEndpoints.length }
}
