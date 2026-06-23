import { useState } from 'react'
import { Droplets, CheckCircle, CloudRain, Trash2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime, getActiveSlots } from '../lib/utils'

interface Props {
  userName: string
  todayWatering: Watering | null
  todayShift: Shift | null
  tomorrowShift: Shift | null
  onWater: (note: string) => Promise<void>
  onRain: () => Promise<void>
  onUndo: () => Promise<void>
}

function ShiftInfo({ label, shift, slot }: {
  label: string
  shift: Shift | null
  slot: 'morning' | 'evening'
}) {
  const names = shift
    ? (slot === 'morning' ? shift.morning_names : shift.evening_names)
    : []
  return (
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className="text-soil-400 shrink-0">{label}</span>
      <span className="font-bold text-soil-700">
        {names.length > 0 ? names.join('・') : '人がいません'}
      </span>
    </div>
  )
}

export function TodayWatering({
  userName, todayWatering, todayShift, tomorrowShift, onWater, onRain, onUndo,
}: Props) {
  const [note,      setNote]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showUndo,  setShowUndo]  = useState(false)

  const slots = getActiveSlots() // 今日の月で朝のみ or 朝夜を決定
  const showEvening = slots.includes('evening')

  const status = todayWatering?.status ?? null   // null=未対応 / 'watered' / 'rain'

  const handleWater = async () => {
    setLoading(true)
    try { await onWater(note); setNote('') } finally { setLoading(false) }
  }
  const handleRain = async () => {
    setLoading(true)
    try { await onRain() } finally { setLoading(false) }
  }
  const handleUndo = async () => {
    setLoading(true)
    try { await onUndo(); setShowUndo(false) } finally { setLoading(false) }
  }

  // ── 状態カード ─────────────────────────────────────────────
  const cardClass = {
    null:      'bg-terra-50 border-2 border-terra-400',
    watered:   'bg-leaf-50 border border-leaf-200',
    rain:      'bg-blue-50 border border-blue-200',
  }[status ?? 'null']

  const icon = {
    null:      <Droplets className="text-terra-500 shrink-0 animate-bounce" size={28} />,
    watered:   <CheckCircle className="text-leaf-500 shrink-0" size={28} />,
    rain:      <CloudRain className="text-blue-400 shrink-0" size={28} />,
  }[status ?? 'null']

  const headline = {
    null:    '⚠ まだ水やりしていません',
    watered: '水やり完了 ✔',
    rain:    '🌧 雨でやらなかった',
  }[status ?? 'null']

  const headlineColor = {
    null:    'text-terra-600',
    watered: 'text-leaf-700',
    rain:    'text-blue-600',
  }[status ?? 'null']

  return (
    <div className="space-y-4">

      {/* ── 今日の状態カード ── */}
      <div className={`rounded-2xl p-5 shadow-sm ${cardClass}`}>
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div>
            <p className="text-sm font-medium text-soil-500">{formatDate(today())}</p>
            <h2 className={`text-xl font-bold ${headlineColor}`}>{headline}</h2>
          </div>
        </div>

        {/* 済み・雨のとき：誰が記録したか */}
        {todayWatering && status !== null && (
          <div className="bg-white/60 rounded-xl p-3 text-sm text-soil-600 space-y-0.5">
            <p>
              <span className="font-bold">{todayWatering.by_name}</span>
              {status === 'watered'
                ? <> さんが <span className="font-bold">{formatTime(todayWatering.created_at)}</span> に対応</>
                : <> さんが雨と判断（{formatDate(todayWatering.date)}）</>
              }
            </p>
            {todayWatering.note && (
              <p className="text-soil-400">「{todayWatering.note}」</p>
            )}
          </div>
        )}

        {/* 未対応のとき：今日の担当を表示 */}
        {status === null && (
          <div className="mt-2 space-y-1 border-t border-terra-200 pt-2">
            <ShiftInfo label="朝担当:" shift={todayShift} slot="morning" />
            {showEvening && <ShiftInfo label="夜担当:" shift={todayShift} slot="evening" />}
          </div>
        )}
      </div>

      {/* ── 未対応：水やり・雨ボタン ── */}
      {status === null && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
          <p className="text-sm text-soil-500 font-medium">記録する（{userName}）</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ（任意）: 例「トマトに多めにあげた」"
            rows={2}
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleWater}
              disabled={loading}
              className="flex-1 bg-leaf-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Droplets size={18} />
              水やりしたよ！
            </button>
            <button
              onClick={handleRain}
              disabled={loading}
              className="flex-1 bg-blue-400 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CloudRain size={18} />
              雨だった
            </button>
          </div>
        </div>
      )}

      {/* ── 記録済み：取り消しリンク ── */}
      {status !== null && (
        <div className="text-center">
          {!showUndo ? (
            <button
              onClick={() => setShowUndo(true)}
              className="text-sm text-soil-400 underline underline-offset-2"
            >
              間違えた？取り消す
            </button>
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-terra-200 space-y-3">
              <p className="text-sm text-terra-600 font-medium">本当に取り消しますか？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUndo(false)}
                  className="flex-1 py-2 rounded-lg border border-soil-200 text-sm text-soil-500"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUndo}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-terra-500 text-white text-sm font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />取り消す
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 明日の担当 ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <p className="text-xs text-soil-400 mb-2">明日（{formatDate(tomorrow())}）の担当</p>
        <div className="space-y-1">
          <ShiftInfo label="🌅 朝:" shift={tomorrowShift} slot="morning" />
          {showEvening && <ShiftInfo label="🌙 夜:" shift={tomorrowShift} slot="evening" />}
        </div>
      </div>

    </div>
  )
}
