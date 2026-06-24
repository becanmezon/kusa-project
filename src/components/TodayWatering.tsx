import { useState } from 'react'
import { Droplets, CheckCircle, CloudRain, Trash2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime, getActiveSlots } from '../lib/utils'

interface Props {
  userName: string
  todayMorningWatering: Watering | null
  todayEveningWatering: Watering | null
  todayShift: Shift | null
  tomorrowShift: Shift | null
  onWater: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onRain: (slot: 'morning' | 'evening') => Promise<void>
  onUndo: (slot: 'morning' | 'evening') => Promise<void>
}

function ShiftNames({ shift, slot }: { shift: Shift | null; slot: 'morning' | 'evening' }) {
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  return (
    <span className="font-bold text-soil-700">
      {names.length > 0 ? names.join('・') : '担当なし'}
    </span>
  )
}

interface SlotCardProps {
  label: string
  emoji: string
  watering: Watering | null
  slot: 'morning' | 'evening'
  todayShift: Shift | null
  onWater: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onRain: (slot: 'morning' | 'evening') => Promise<void>
  onUndo: (slot: 'morning' | 'evening') => Promise<void>
}

function SlotCard({ label, emoji, watering, slot, todayShift, onWater, onRain, onUndo }: SlotCardProps) {
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showUndo, setShowUndo] = useState(false)

  const status = watering?.status ?? null

  const cardBg = status === null
    ? 'bg-terra-50 border-2 border-terra-400'
    : status === 'watered'
      ? 'bg-leaf-50 border border-leaf-200'
      : 'bg-blue-50 border border-blue-200'

  const icon = status === null
    ? <Droplets className="text-terra-500 shrink-0" size={22} />
    : status === 'watered'
      ? <CheckCircle className="text-leaf-500 shrink-0" size={22} />
      : <CloudRain className="text-blue-400 shrink-0" size={22} />

  const headline = status === null
    ? 'まだです'
    : status === 'watered' ? '済み ✔' : '雨だった'

  const headlineColor = status === null
    ? 'text-terra-600'
    : status === 'watered' ? 'text-leaf-700' : 'text-blue-600'

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${cardBg}`}>
      {/* スロットヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div className="flex-1">
          <p className="text-xs text-soil-400">{emoji} {label}</p>
          <p className={`font-bold text-base ${headlineColor}`}>{headline}</p>
        </div>
      </div>

      {/* 記録済み：誰が対応したか */}
      {watering && (
        <div className="bg-white/60 rounded-xl px-3 py-2 text-sm text-soil-600 space-y-0.5">
          <p>
            <span className="font-bold">{watering.by_name}</span>
            {status === 'watered'
              ? <> さんが <span className="font-bold">{formatTime(watering.created_at)}</span> に対応</>
              : ' さんが雨と判断'
            }
          </p>
          {watering.note && <p className="text-soil-400">「{watering.note}」</p>}
        </div>
      )}

      {/* 未対応：担当者表示 */}
      {status === null && (
        <p className="text-sm text-soil-500 mb-3">
          担当: <ShiftNames shift={todayShift} slot={slot} />
        </p>
      )}

      {/* 未対応：入力フォーム */}
      {status === null && (
        <div className="space-y-2 mt-1">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ（任意）"
            rows={1}
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => wrap(() => onWater(note, slot).then(() => setNote('')))}
              disabled={loading}
              className="flex-1 bg-leaf-500 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
            >
              <Droplets size={16} /> 水やりした
            </button>
            <button
              onClick={() => wrap(() => onRain(slot))}
              disabled={loading}
              className="flex-1 bg-blue-400 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
            >
              <CloudRain size={16} /> 雨だった
            </button>
          </div>
        </div>
      )}

      {/* 記録済み：取り消し */}
      {status !== null && (
        <div className="mt-2 text-center">
          {!showUndo ? (
            <button
              onClick={() => setShowUndo(true)}
              className="text-xs text-soil-400 underline underline-offset-2"
            >
              取り消す
            </button>
          ) : (
            <div className="bg-white rounded-xl p-3 border border-terra-200 space-y-2">
              <p className="text-xs text-terra-600 font-medium">本当に取り消しますか？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUndo(false)}
                  className="flex-1 py-1.5 rounded-lg border border-soil-200 text-xs text-soil-500"
                >キャンセル</button>
                <button
                  onClick={() => wrap(() => onUndo(slot).then(() => setShowUndo(false)))}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded-lg bg-terra-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} /> 取り消す
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TodayWatering({
  userName, todayMorningWatering, todayEveningWatering,
  todayShift, tomorrowShift, onWater, onRain, onUndo,
}: Props) {
  const slots = getActiveSlots()
  const showEvening = slots.includes('evening')

  return (
    <div className="space-y-4">

      {/* 日付ヘッダー */}
      <div className="px-1">
        <p className="text-sm font-medium text-soil-500">{formatDate(today())} の水やり</p>
        <p className="text-xs text-soil-400">記録者: {userName}</p>
      </div>

      {/* 朝枠 */}
      <SlotCard
        label="朝の水やり"
        emoji="🌅"
        watering={todayMorningWatering}
        slot="morning"
        todayShift={todayShift}
        onWater={onWater}
        onRain={onRain}
        onUndo={onUndo}
      />

      {/* 夜枠（7〜9月のみ） */}
      {showEvening && (
        <SlotCard
          label="夜の水やり"
          emoji="🌙"
          watering={todayEveningWatering}
          slot="evening"
          todayShift={todayShift}
          onWater={onWater}
          onRain={onRain}
          onUndo={onUndo}
        />
      )}

      {/* 明日の担当 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <p className="text-xs text-soil-400 mb-2">明日（{formatDate(tomorrow())}）の担当</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-soil-400 shrink-0">🌅 朝:</span>
            <ShiftNames shift={tomorrowShift} slot="morning" />
          </div>
          {showEvening && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-soil-400 shrink-0">🌙 夜:</span>
              <ShiftNames shift={tomorrowShift} slot="evening" />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
