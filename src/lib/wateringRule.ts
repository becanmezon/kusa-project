// ─── 水やり担当枠（朝／夜）のルール ──────────────────────────────
// 「その日に朝枠だけを使うのか、朝＋夜の2枠を使うのか」を決める唯一の場所。
// 画面（今日／明日／履歴／展示モード）とサーバー側のリマインド通知は
// すべてこのファイルの判定を使う。ルールを変えるときはここだけを直す。
//
// ブラウザ専用APIは一切使わないこと（api/ のサーバー関数からも import するため）。

export type Slot = 'morning' | 'evening'

/**
 * この日以降は朝・夜の2枠制を恒久適用する（期限なし）。
 * 2026-10-17 から「夏だけ夜担当」をやめ、通年で夜担当も表示・記録・通知する。
 */
export const DUAL_SLOT_START_DATE = '2026-10-17'

/** DUAL_SLOT_START_DATE より前の期間に適用していた「夏だけ2枠」の対象月 */
const LEGACY_DUAL_SLOT_MONTHS = [7, 8, 9]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 指定日が朝・夜の2枠制かどうかを返す
 * - 2026-10-17 以降: 常に2枠（期限なし）
 * - それより前: 7〜9月のみ2枠（2026-10-01〜10-16 は朝のみ＝従来どおり）
 * @param dateStr "YYYY-MM-DD"
 */
export function isDualSlotDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false
  if (dateStr >= DUAL_SLOT_START_DATE) return true
  return LEGACY_DUAL_SLOT_MONTHS.includes(Number(dateStr.slice(5, 7)))
}

/**
 * 指定日に表示・記録すべき担当枠を返す
 * @param dateStr "YYYY-MM-DD"
 */
export function getSlotsForDate(dateStr: string): Slot[] {
  return isDualSlotDate(dateStr) ? ['morning', 'evening'] : ['morning']
}

/** 指定日に夜担当があるか（= 夜のリマインド通知を送るか） */
export function hasEveningSlot(dateStr: string): boolean {
  return isDualSlotDate(dateStr)
}
