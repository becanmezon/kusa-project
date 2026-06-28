import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

type Res = { status(code: number): Res; json(data: unknown): void }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
)

export default async function handler(
  req: { method: string; body: { user_name?: string; title?: string; body?: string } },
  res: Res,
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_name, title, body } = req.body ?? {}
  if (!user_name) return res.status(400).json({ error: 'user_name required' })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_name', user_name)

  const payload = JSON.stringify({ title: title ?? '草プロジェクト', body: body ?? 'テスト通知' })

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
      console.error('[send-push] failed statusCode=%d body=%s', statusCode, (err as { body?: string }).body ?? '')
      // 410 Gone / 404 Not Found = 購読が無効（VAPIDキー変更後など）→ 自動削除
      if (statusCode === 410 || statusCode === 404) {
        expiredEndpoints.push(row.endpoint as string)
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    console.log('[send-push] deleted %d expired subscriptions', expiredEndpoints.length)
  }

  return res.status(200).json({ sent, failed, expired_deleted: expiredEndpoints.length })
}
