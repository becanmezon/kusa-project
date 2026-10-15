/**
 * 「草プロ転送用シフト」の Apps Script（ウェブアプリ）を呼び出して、
 * スプレッドシートの最新シフトを Supabase に即時反映させる。
 * URL はコードに既定値を持ち、Vercel の環境変数 VITE_SHIFT_SYNC_URL があればそちらを使う。
 */
// 公開しても問題ないURL（呼ばれてもシフトを取り込み直すだけ）。環境変数があればそちらを優先
const DEFAULT_SHIFT_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbx8uQA-vC2yvIR0JHvPBzkzh2ty3uPFyJSapPMKryIZovwB-5ErabBO2oKUqNcvE-LL/exec'
const SHIFT_SYNC_URL =
  (import.meta.env.VITE_SHIFT_SYNC_URL as string | undefined) || DEFAULT_SHIFT_SYNC_URL

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
