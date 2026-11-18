// Supabase の REST API（PostgREST）を fetch だけで呼ぶ軽い関数
// 「今日」の表示と水やり記録はこれを使い、重い supabase-js を最初に読み込まなくて済むようにする。
// Service Worker（オフライン時の送り直し）からも同じ関数を使う。

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/** supabase-js と同じヘッダー（apikey と Authorization の両方） */
function headers(extra?: Record<string, string>): Record<string, string> {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra }
}

export class RestError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** 通信自体ができなかった（オフライン・圏外）かどうか */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof RestError) return false
  return e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new RestError(res.status, text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** 一覧の取得。params は PostgREST の書き方（例: ['date', 'gte.2026-11-01']） */
export function restSelect<T>(table: string, params: [string, string][]): Promise<T[]> {
  const qs = new URLSearchParams([['select', '*'], ...params]).toString()
  return request<T[]>(`${table}?${qs}`, { headers: headers() })
}

/** 登録（すでにあれば上書き）。登録後の行を返す */
export async function restUpsert<T>(table: string, row: Record<string, unknown>, onConflict: string): Promise<T> {
  const rows = await request<T[]>(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(row),
  })
  return rows[0]
}

/** 削除。filters は列名と値（すべて eq で絞り込む） */
export function restDelete(table: string, filters: Record<string, string>): Promise<void> {
  const qs = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, `eq.${v}`])).toString()
  return request<void>(`${table}?${qs}`, { method: 'DELETE', headers: headers() })
}

/** Storage の公開URL（supabase-js の getPublicUrl と同じ形） */
export function publicStorageUrl(bucket: string, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${URL_BASE}/storage/v1/object/public/${bucket}/${encoded}`
}
