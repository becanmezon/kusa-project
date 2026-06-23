import { useState } from 'react'
import { ChevronLeft, ChevronRight, Save, Trash2, ClipboardPaste } from 'lucide-react'
import type { Shift } from '../types'
import { formatDate } from '../lib/utils'

// 週の月曜日から7日分の "YYYY-MM-DD" を返す
function weekDates(baseDate: Date): string[] {
  const d = new Date(baseDate)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // 月曜始まりに調整
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
  })
}

// names[] を「コマ別文字列」に変換するためのヘルパー
// 保存時は3コマの名前をフラットにまとめる
interface DaySlots {
  slot1: string  // "たろう,はなこ" などのカンマ区切り
  slot2: string
  slot3: string
}

const EMPTY_SLOTS: DaySlots = { slot1: '', slot2: '', slot3: '' }

function slotsToNames(slots: DaySlots): string[] {
  return [slots.slot1, slots.slot2, slots.slot3]
    .flatMap(s => s.split(/[,、\s]+/).map(n => n.trim()).filter(Boolean))
    .filter((n, i, arr) => arr.indexOf(n) === i) // 重複除去
}

function namesToSlotHint(names: string[]): DaySlots {
  // 既存データを slot1 にまとめて表示（編集しやすいよう）
  return { slot1: names.join(', '), slot2: '', slot3: '' }
}

/** コピペ貼り付けパーサー
 * 対応フォーマット（行ごと）:
 *   YYYY-MM-DD<TAB>1コマ名前,名前<TAB>2コマ名前<TAB>3コマ名前
 *   または
 *   M/D<TAB>1コマ...<TAB>...
 *   または
 *   YYYY/MM/DD,名前,名前,...  (CSV: 日付+全名前)
 */
function parsePaste(text: string, weekYear: number): Map<string, DaySlots> {
  const result = new Map<string, DaySlots>()
  const lines = text.trim().split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    // タブ区切りを優先、なければカンマ
    const sep = line.includes('\t') ? '\t' : ','
    const cols = line.split(sep).map(c => c.trim())
    if (cols.length < 1) continue

    // 日付パース
    const rawDate = cols[0]
    let dateStr = ''
    // YYYY-MM-DD or YYYY/MM/DD
    const fullMatch = rawDate.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
    if (fullMatch) {
      dateStr = `${fullMatch[1]}-${fullMatch[2].padStart(2, '0')}-${fullMatch[3].padStart(2, '0')}`
    } else {
      // M/D 形式 → weekYear を使って補完
      const shortMatch = rawDate.match(/(\d{1,2})[/月](\d{1,2})/)
      if (shortMatch) {
        dateStr = `${weekYear}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`
      }
    }
    if (!dateStr) continue

    const slots: DaySlots = {
      slot1: cols[1] ?? '',
      slot2: cols[2] ?? '',
      slot3: cols[3] ?? '',
    }
    result.set(dateStr, slots)
  }
  return result
}

interface Props {
  shifts: Shift[]
  onSave: (date: string, names: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function WeeklyShiftEditor({ shifts, onSave, onDelete }: Props) {
  const [baseDate, setBaseDate] = useState(() => new Date())
  const [editMap, setEditMap] = useState<Map<string, DaySlots>>(new Map())
  const [saving, setSaving] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set())

  const dates = weekDates(baseDate)
  const weekYear = new Date(dates[0]).getFullYear()

  const prevWeek = () => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - 7)
    setBaseDate(d)
    setEditMap(new Map())
  }
  const nextWeek = () => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 7)
    setBaseDate(d)
    setEditMap(new Map())
  }

  const getSlots = (dateStr: string): DaySlots => {
    if (editMap.has(dateStr)) return editMap.get(dateStr)!
    const shift = shifts.find(s => s.date === dateStr)
    if (shift) return namesToSlotHint(shift.names)
    return EMPTY_SLOTS
  }

  const updateSlot = (dateStr: string, field: keyof DaySlots, value: string) => {
    setEditMap(prev => {
      const next = new Map(prev)
      const current = next.get(dateStr) ?? getSlots(dateStr)
      next.set(dateStr, { ...current, [field]: value })
      return next
    })
  }

  // 週全体を一括保存
  const handleSaveWeek = async () => {
    setSaving(true)
    const saved = new Set<string>()
    try {
      for (const dateStr of dates) {
        const slots = getSlots(dateStr)
        const names = slotsToNames(slots)
        if (names.length > 0) {
          await onSave(dateStr, names)
          saved.add(dateStr)
        }
      }
      setSavedDates(saved)
      setEditMap(new Map())
      setTimeout(() => setSavedDates(new Set()), 2000)
    } finally {
      setSaving(false)
    }
  }

  // コピペ取り込み
  const handlePasteImport = () => {
    const parsed = parsePaste(pasteText, weekYear)
    if (parsed.size === 0) {
      alert('貼り付けデータを認識できませんでした。\n形式: 日付<TAB>1コマ<TAB>2コマ<TAB>3コマ')
      return
    }
    setEditMap(prev => {
      const next = new Map(prev)
      parsed.forEach((slots, date) => next.set(date, slots))
      return next
    })
    setPasteText('')
    setShowPaste(false)
  }

  const weekLabel = (() => {
    const s = new Date(dates[0])
    const e = new Date(dates[6])
    return `${s.getMonth() + 1}/${s.getDate()} 〜 ${e.getMonth() + 1}/${e.getDate()}`
  })()

  return (
    <div className="space-y-4">
      {/* 週ナビ */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <div className="flex items-center justify-between mb-1">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-soil-50 text-soil-600">
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-soil-700">{weekLabel}</span>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-soil-50 text-soil-600">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* コピペボタン */}
        <button
          onClick={() => setShowPaste(v => !v)}
          className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-soil-500 border border-dashed border-soil-200 rounded-lg py-2 hover:border-leaf-400 hover:text-leaf-600 transition-colors"
        >
          <ClipboardPaste size={15} />
          Excelからコピペで貼り付け
        </button>

        {showPaste && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-soil-400">
              形式（タブ区切り推奨）:<br />
              <code className="bg-cream px-1 rounded text-xs">日付　1コマ名前,名前　2コマ名前　3コマ名前</code><br />
              例: <code className="bg-cream px-1 rounded text-xs">6/23　たろう,はなこ　けんじ　</code>
            </p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="ここにExcelのセルをコピーして貼り付け..."
              rows={5}
              className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPaste(false); setPasteText('') }}
                className="flex-1 py-2 rounded-lg border border-soil-200 text-sm text-soil-500"
              >
                キャンセル
              </button>
              <button
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                className="flex-1 py-2 rounded-lg bg-leaf-500 text-white text-sm font-bold disabled:opacity-40"
              >
                取り込む
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1週間の入力テーブル */}
      <div className="space-y-3">
        {dates.map(dateStr => {
          const slots = getSlots(dateStr)
          const existingShift = shifts.find(s => s.date === dateStr)
          const isDirty = editMap.has(dateStr)
          const isSaved = savedDates.has(dateStr)
          const hasNames = slotsToNames(slots).length > 0

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-xl p-3 shadow-sm border transition-colors ${
                isSaved
                  ? 'border-leaf-300 bg-leaf-50'
                  : isDirty
                  ? 'border-leaf-200'
                  : 'border-soil-100'
              }`}
            >
              {/* 日付ヘッダー */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-soil-700">
                  {formatDate(dateStr)}
                  {isSaved && <span className="ml-2 text-xs text-leaf-600">✔ 保存済み</span>}
                </span>
                {existingShift && !isDirty && (
                  <button
                    onClick={() => onDelete(existingShift.id)}
                    className="text-soil-300 hover:text-terra-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* 3コマ入力 */}
              <div className="space-y-1.5">
                {(['slot1', 'slot2', 'slot3'] as const).map((field, idx) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs text-soil-400 w-10 shrink-0">{idx + 1}コマ</span>
                    <input
                      type="text"
                      value={slots[field]}
                      onChange={e => updateSlot(dateStr, field, e.target.value)}
                      placeholder="名前（複数はカンマ区切り）"
                      className="flex-1 border border-soil-200 rounded-lg px-2 py-1.5 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-1 focus:ring-leaf-400"
                    />
                  </div>
                ))}
              </div>

              {/* この日の担当プレビュー */}
              {hasNames && (
                <p className="mt-2 text-xs text-soil-400">
                  担当候補: <span className="text-leaf-600 font-medium">{slotsToNames(slots).join('・')}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* 一括保存ボタン */}
      <button
        onClick={handleSaveWeek}
        disabled={saving}
        className="w-full bg-soil-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 sticky bottom-20"
      >
        <Save size={18} />
        {saving ? '保存中...' : '1週間分をまとめて保存'}
      </button>
    </div>
  )
}
