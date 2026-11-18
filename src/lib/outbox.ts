// オフライン中の水やり記録を一時保存して、つながったら送る「送信待ちリスト」
//
// ・保存先は IndexedDB（アプリを閉じても残る。アプリ画面と Service Worker の両方から読める）
// ・同じ日付・枠（朝/夜）の操作は最後のものだけを残す（「水やりした→取り消し」なら取り消しだけ送る）
//   → 送る順番が前後しても結果が変わらない
// ・送信は navigator.locks で1か所ずつ行い、アプリ画面と Service Worker が同時に送って二重になるのを防ぐ
import { restUpsert, restDelete, RestError } from './rest'

export const OUTBOX_SYNC_TAG = 'kusa-outbox'

const DB_NAME = 'kusa-offline'
const STORE = 'outbox'

export type Slot = 'morning' | 'evening'

export interface OutboxOp {
  /** `${date}:${slot}` 同じ枠の操作は上書き */
  key: string
  /** 送信済みかどうかを見分けるための通し番号 */
  id: string
  type: 'upsert' | 'delete'
  date: string
  slot: Slot
  by_name?: string
  note?: string | null
  status?: 'watered' | 'rain'
  queuedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); resolve(req ? req.result : undefined) }
    t.onerror = () => { db.close(); reject(t.error) }
  })
}

/** 送信待ちの操作をすべて（古い順） */
export async function listOutbox(): Promise<OutboxOp[]> {
  if (typeof indexedDB === 'undefined') return []
  const all = (await tx<OutboxOp[]>('readonly', s => s.getAll())) ?? []
  return all.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
}

/** 操作を送信待ちに入れる（同じ日付・枠の古い操作は置き換え） */
export async function queueOp(op: Omit<OutboxOp, 'key' | 'id' | 'queuedAt'>): Promise<OutboxOp> {
  const full: OutboxOp = {
    ...op,
    key: `${op.date}:${op.slot}`,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
  }
  await tx('readwrite', s => s.put(full))
  return full
}

/** 送れたものだけ消す（送っている間に新しい操作で上書きされていたら残す） */
async function removeIfSame(op: OutboxOp): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite')
    const store = t.objectStore(STORE)
    const get = store.get(op.key)
    get.onsuccess = () => { if (get.result?.id === op.id) store.delete(op.key) }
    t.oncomplete = () => { db.close(); resolve() }
    t.onerror = () => { db.close(); reject(t.error) }
  })
}

async function send(op: OutboxOp): Promise<void> {
  if (op.type === 'upsert') {
    await restUpsert('waterings', {
      date: op.date, slot: op.slot, by_name: op.by_name, note: op.note ?? null, status: op.status ?? 'watered',
    }, 'date,slot')
  } else {
    await restDelete('waterings', { date: op.date, slot: op.slot })
  }
}

export interface FlushResult { sent: number; dropped: number; remaining: number }

async function flushInner(): Promise<FlushResult> {
  const ops = await listOutbox()
  let sent = 0
  let dropped = 0
  for (const op of ops) {
    try {
      await send(op)
      await removeIfSame(op)
      sent++
    } catch (e) {
      // サーバーが受け付けなかった（4xx）ものは、何度送っても通らないので捨てる。混雑・一時的な失敗は残す
      if (e instanceof RestError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
        console.error('送信できなかった記録を破棄しました', op, e)
        await removeIfSame(op)
        dropped++
        continue
      }
      break // 通信できない → 次の機会に
    }
  }
  const remaining = (await listOutbox()).length
  return { sent, dropped, remaining }
}

/** 送信待ちをまとめて送る（アプリ画面・Service Worker のどちらから呼んでも、同時には1つだけ動く） */
export async function flushOutbox(): Promise<FlushResult> {
  if (typeof indexedDB === 'undefined') return { sent: 0, dropped: 0, remaining: 0 }
  const locks = (typeof navigator !== 'undefined' ? navigator.locks : undefined) as LockManager | undefined
  if (locks?.request) return locks.request(OUTBOX_SYNC_TAG, () => flushInner())
  return flushInner()
}

/** つながったら Service Worker に送ってもらう予約（Background Sync。対応ブラウザのみ） */
export async function requestBackgroundSync(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker?.ready
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } })?.sync
    if (!sync) return false
    await sync.register(OUTBOX_SYNC_TAG)
    return true
  } catch {
    return false
  }
}

/** 画面表示用：サーバーから取った記録に、まだ送れていない操作を上乗せする */
export function applyPendingOps<W extends { id: string; date: string; slot: Slot; created_at: string }>(
  waterings: W[],
  ops: OutboxOp[],
): W[] {
  if (ops.length === 0) return waterings
  let out = [...waterings]
  for (const op of ops) {
    out = out.filter(w => !(w.date === op.date && w.slot === op.slot))
    if (op.type === 'upsert') {
      out.push({
        id: `pending:${op.key}`,
        date: op.date,
        slot: op.slot,
        by_name: op.by_name ?? '',
        note: op.note ?? null,
        status: op.status ?? 'watered',
        created_at: op.queuedAt,
      } as unknown as W)
    }
  }
  return out
}

/** まだ送信できていない記録かどうか */
export function isPendingRecord(w: { id: string } | null | undefined): boolean {
  return !!w && w.id.startsWith('pending:')
}
