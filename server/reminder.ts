// ─── 水やりリマインド通知の本体 ───────────────────────────────
// Vercel Cron から叩かれる 2 本のエンドポイント
//   /api/reminder/evening  …… 毎日 17:00 JST「今日の夜担当」へ
//   /api/reminder/tomorrow …… 毎日 21:00 JST「明日の担当」へ（前日リマインド）
// 朝だけの日か朝夜2枠の日かは src/lib/wateringRule.ts の判定だけに従う。
//
// 手元での確認（送信せず内容だけ返す dry-run）:
//   /api/reminder/evening?dry=1&testdate=2026-10-17
//   /api/reminder/tomorrow?dry=1&testdate=2026-10-16

import { hasEveningSlot, type Slot } from '../src/lib/wateringRule'
import { sendToUsers, supabase, type SendResult } from './push'

export type ReminderType = 'evening' | 'tomorrow'

export interface ApiRequest {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status(code: number): ApiResponse
  json(data: unknown): void
}

interface ShiftRow {
  morning_names: string[] | null
  evening_names: string[] | null
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const SLOT_LABEL: Record<Slot, string> = { morning: '☀️朝', evening: '🌙夜' }

/** 日本時間の「今日」を "YYYY-MM-DD" で返す（サーバーはUTCで動くため補正する） */
function jstDateStr(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

/** "YYYY-MM-DD" に days 日足した日付を返す */
function addDays(dateStr: string, days: number): string {
  const t = new Date(`${dateStr}T00:00:00Z`).getTime() + days * DAY_MS
  return new Date(t).toISOString().slice(0, 10)
}

/** "YYYY-MM-DD" → "M/D" */
function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

function firstParam(req: ApiRequest, key: string): string | undefined {
  const fromQuery = req.query?.[key]
  if (typeof fromQuery === 'string') return fromQuery
  if (Array.isArray(fromQuery)) return fromQuery[0]
  // query が無い環境（生の Node リクエスト）向けのフォールバック
  if (req.url) {
    const value = new URL(req.url, 'http://localhost').searchParams.get(key)
    if (value !== null) return value
  }
  return undefined
}

/**
 * CRON_SECRET が設定されている場合は Vercel Cron からの呼び出しだけを許可する。
 * 未設定なら従来の /api/send-push と同じく誰でも叩ける。
 */
function isAuthorized(req: ApiRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers?.authorization
  return auth === `Bearer ${secret}`
}

async function fetchShift(date: string): Promise<ShiftRow | null> {
  const { data, error } = await supabase
    .from('shifts')
    .select('morning_names, evening_names')
    .eq('date', date)
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

/** その日・その枠がすでに記録済み（水やり済み or 雨）かどうか */
async function isAlreadyRecorded(date: string, slot: Slot): Promise<boolean> {
  const { data, error } = await supabase
    .from('waterings')
    .select('id')
    .eq('date', date)
    .eq('slot', slot)
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

interface Target {
  names: string[]
  title: string
  body: string
}

/** 17:00 JST: 今日の夜担当へのリマインド（朝だけの日は送らない） */
async function buildEveningTargets(date: string): Promise<{ targets: Target[]; skipped?: string }> {
  if (!hasEveningSlot(date)) {
    return { targets: [], skipped: 'この日は朝のみの担当ルールのため夜のリマインドは送りません' }
  }
  if (await isAlreadyRecorded(date, 'evening')) {
    return { targets: [], skipped: 'すでに夜の記録が入っているため送りません' }
  }
  const shift = await fetchShift(date)
  const names = shift?.evening_names ?? []
  if (names.length === 0) {
    return { targets: [], skipped: '夜の担当が登録されていません' }
  }
  return {
    targets: [{
      names,
      title: '🌙 夜の水やり',
      body: `今日（${shortDate(date)}）の夜の水やり担当です。よろしくお願いします🌱`,
    }],
  }
}

/** 21:00 JST: 明日の担当へのリマインド（夜担当も対象に含める） */
async function buildTomorrowTargets(date: string): Promise<{ targets: Target[]; skipped?: string }> {
  const shift = await fetchShift(date)
  const morningNames = shift?.morning_names ?? []
  // 明日が2枠制の日なら夜担当もリマインド対象にする
  const eveningNames = hasEveningSlot(date) ? (shift?.evening_names ?? []) : []

  // 朝と夜を兼任する人に2通届かないよう、担当枠の組み合わせごとにまとめて送る
  const slotsByName = new Map<string, Slot[]>()
  for (const [slot, names] of [['morning', morningNames], ['evening', eveningNames]] as const) {
    for (const name of names) {
      slotsByName.set(name, [...(slotsByName.get(name) ?? []), slot])
    }
  }
  if (slotsByName.size === 0) {
    return { targets: [], skipped: '明日の担当が登録されていません' }
  }

  const namesBySlots = new Map<string, string[]>()
  for (const [name, slots] of slotsByName) {
    const key = slots.join('+')
    namesBySlots.set(key, [...(namesBySlots.get(key) ?? []), name])
  }

  return {
    targets: [...namesBySlots].map(([key, names]) => {
      const label = key.split('+').map(s => SLOT_LABEL[s as Slot]).join('・')
      return {
        names,
        title: '🌱 明日の水やり担当',
        body: `明日（${shortDate(date)}）の${label}の水やり担当です。よろしくお願いします！`,
      }
    }),
  }
}

export async function handleReminder(
  type: ReminderType,
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const dry = firstParam(req, 'dry') === '1'

  if (!dry && !isAuthorized(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  // 基準日は日本時間の今日。?testdate=YYYY-MM-DD を付けるとその日を「今日」として扱う
  const testdate = firstParam(req, 'testdate')
  const baseDate = testdate && DATE_RE.test(testdate) ? testdate : jstDateStr()
  // evening は当日の夜担当、tomorrow は翌日の担当が対象
  const targetDate = type === 'tomorrow' ? addDays(baseDate, 1) : baseDate

  try {
    const { targets, skipped } = type === 'evening'
      ? await buildEveningTargets(targetDate)
      : await buildTomorrowTargets(targetDate)

    const total: SendResult = { sent: 0, failed: 0, expired_deleted: 0 }
    if (!dry) {
      for (const t of targets) {
        const r = await sendToUsers(t.names, t.title, t.body)
        total.sent += r.sent
        total.failed += r.failed
        total.expired_deleted += r.expired_deleted
      }
    }

    res.status(200).json({
      type,
      date: targetDate,
      dual_slot: hasEveningSlot(targetDate),
      dry,
      skipped: skipped ?? null,
      targets,
      ...total,
    })
  } catch (err: unknown) {
    console.error('[reminder] %s failed:', type, err)
    res.status(500).json({ error: 'reminder failed', type, date: targetDate })
  }
}
