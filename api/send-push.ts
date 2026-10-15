// 「自分にテスト通知を送る」用の手動エンドポイント（通知設定UIから呼ばれる）
import { sendToUsers } from '../server/push'

type Res = { status(code: number): Res; json(data: unknown): void }

export default async function handler(
  req: { method: string; body: { user_name?: string; title?: string; body?: string } },
  res: Res,
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_name, title, body } = req.body ?? {}
  if (!user_name) return res.status(400).json({ error: 'user_name required' })

  const result = await sendToUsers(
    [user_name],
    title ?? '草プロジェクト',
    body ?? 'テスト通知',
  )

  return res.status(200).json(result)
}
