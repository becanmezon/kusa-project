/**
 * 「草プロ転送用シフト」の Apps Script（ウェブアプリ）を呼び出して、
 * スプレッドシートの最新シフトを Supabase に即時反映させる。
 * URL は Vercel の環境変数 VITE_SHIFT_SYNC_URL に入れる（未設定ならシフト同期はスキップ）。
 */
const SHIFT_SYNC_URL = import.meta.env.VITE_SHIFT_SYNC_URL as string | undefined

export type ShiftSyncResult = 'synced' | 'skipped' | 'failed'

export async function requestShiftSync(): Promise<ShiftSyncResult> {
  if (!SHIFT_SYNC_URL) return 'skipped'
  try {
    const res = await fetch(SHIFT_SYNC_URL, { method: 'GET', redirect: 'follow' })
    const body = await res.json().catch(() => null) as { ok?: boolean } | null
    return res.ok && body?.ok ? 'synced' : 'failed'
  } catch (e) {
    console.error('shift sync failed', e)
    return 'failed'
  }
}
