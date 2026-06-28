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
    .select('subscription')
    .eq('user_name', user_name)

  const payload = JSON.stringify({ title: title ?? '草プロジェクト', body: body ?? 'テスト通知' })

  const results = await Promise.allSettled(
    (subs ?? []).map(row =>
      webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return res.status(200).json({ sent, failed: results.length - sent })
}
