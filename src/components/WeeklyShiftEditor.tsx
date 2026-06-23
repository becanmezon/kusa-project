import { useState } from 'react'
import { ChevronLeft, ChevronRight, Save, Trash2, Sun, Moon } from 'lucide-react'
import type { Shift } from '../types'
import { formatDate } from '../lib/utils'
import { MEMBERS } from '../lib/members'

// 週の月曜から7日分の "YYYY-MM-DD" を返す
function weekDates(base: Date): string[] {
  const d = new Date(base)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`
  })
}

interface DayEdit {
  morning: string[]
  evening: string[]
}

interface Props {
  shifts: Shift[]
  onSave: (date: string, morning: string[], evening: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function MemberChips({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (name: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {MEMBERS.map(name => {
        const isOn = selected.includes(name)
        return (
          <button
            key={name}
            onClick={() => onToggle(name)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isOn
                ? 'bg-leaf-500 text-white'
                : 'bg-soil-50 text-soil-600 border border-soil-200'
            }`}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

export function WeeklyShiftEditor({ shifts, onSave, onDelete }: Props) {
  const [base,     setBase]     = useState(() => new Date())
  const [editMap,  setEditMap]  = useState<Map<string, DayEdit>>(new Map())
  const [saving,   setSaving]   = useState(false)
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())

  const dates = weekDates(base)

  const prevWeek = () => { const d = new Date(base); d.setDate(d.getDate()-7); setBase(d); setEditMap(new Map()) }
  const nextWeek = () => { const d = new Date(base); d.setDate(d.getDate()+7); setBase(d); setEditMap(new Map()) }

  const getEdit = (dateStr: string): DayEdit => {
    if (editMap.has(dateStr)) return editMap.get(dateStr)!
    const s = shifts.find(s => s.date === dateStr)
    return s
      ? { morning: s.morning_names ?? [], evening: s.evening_names ?? [] }
      : { morning: [], evening: [] }
  }

  const toggleMember = (dateStr: string, slot: 'morning' | 'evening', name: string) => {
    setEditMap(prev => {
      const next  = new Map(prev)
      const cur   = { ...getEdit(dateStr) }
      const arr   = cur[slot]
      cur[slot]   = arr.includes(name) ? arr.filter(n => n !== name) : [...arr, name]
      next.set(dateStr, cur)
      return next
    })
  }

  const handleSaveWeek = async () => {
    setSaving(true)
    const saved = new Set<string>()
    try {
      for (const dateStr of dates) {
        const { morning, evening } = getEdit(dateStr)
        if (morning.length > 0 || evening.length > 0) {
          await onSave(dateStr, morning, evening)
          saved.add(dateStr)
        }
      }
      setSavedSet(saved)
      setEditMap(new Map())
      setTimeout(() => setSavedSet(new Set()), 2500)
    } finally {
      setSaving(false)
    }
  }

  const weekLabel = (() => {
    const s = new Date(dates[0])
    const e = new Date(dates[6])
    return `${s.getMonth()+1}/${s.getDate()} 〜 ${e.getMonth()+1}/${e.getDate()}`
  })()

  return (
    <div className="space-y-4">

      {/* 週ナビ */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-soil-100">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-soil-50 text-soil-600">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-soil-700">{weekLabel}</span>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-soil-50 text-soil-600">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 凡例 */}
      <p className="text-xs text-soil-400 px-1">
        名前をタップで担当ON/OFF。緑 = 担当あり。まとめて保存ボタンで確定します。
      </p>

      {/* 1日ずつのカード */}
      {dates.map(dateStr => {
        const edit     = getEdit(dateStr)
        const existing = shifts.find(s => s.date === dateStr)
        const isDirty  = editMap.has(dateStr)
        const isSaved  = savedSet.has(dateStr)

        return (
          <div
            key={dateStr}
            className={`bg-white rounded-2xl p-4 shadow-sm border transition-colors ${
              isSaved ? 'border-leaf-300 bg-leaf-50/50'
              : isDirty ? 'border-leaf-200'
              : 'border-soil-100'
            }`}
          >
            {/* 日付ヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-soil-700">
                {formatDate(dateStr)}
                {isSaved && <span className="ml-2 text-xs text-leaf-600 font-normal">✔ 保存済み</span>}
              </span>
              {existing && !isDirty && (
                <button
                  onClick={() => onDelete(existing.id)}
                  className="text-soil-300 hover:text-terra-500 p-1"
                  title="このシフトを削除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* 朝担当 */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-soil-500 mb-1">
                <Sun size={13} className="text-terra-400" />
                朝担当
                {edit.morning.length > 0 && (
                  <span className="text-leaf-600 font-bold">
                    {edit.morning.join('・')}
                  </span>
                )}
              </div>
              <MemberChips
                selected={edit.morning}
                onToggle={name => toggleMember(dateStr, 'morning', name)}
              />
            </div>

            {/* 夜担当 */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-soil-500 mb-1">
                <Moon size={13} className="text-soil-400" />
                夜担当
                <span className="text-soil-300 font-normal">（7〜9月に表示）</span>
                {edit.evening.length > 0 && (
                  <span className="text-leaf-600 font-bold">
                    {edit.evening.join('・')}
                  </span>
                )}
              </div>
              <MemberChips
                selected={edit.evening}
                onToggle={name => toggleMember(dateStr, 'evening', name)}
              />
            </div>
          </div>
        )
      })}

      {/* 一括保存ボタン */}
      <button
        onClick={handleSaveWeek}
        disabled={saving}
        className="w-full bg-soil-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 sticky bottom-4"
      >
        <Save size={18} />
        {saving ? '保存中...' : '1週間分をまとめて保存'}
      </button>
    </div>
  )
}
