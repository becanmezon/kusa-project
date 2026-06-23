import { useState } from 'react'
import { Droplets, CheckCircle, Trash2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime } from '../lib/utils'

interface Props {
  userName: string
  todayWatering: Watering | null
  tomorrowShift: Shift | null
  todayShift: Shift | null
  onWater: (note: string) => Promise<void>
  onUndo: () => Promise<void>
}

export function TodayWatering({
  userName,
  todayWatering,
  tomorrowShift,
  todayShift,
  onWater,
  onUndo,
}: Props) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUndo, setShowUndo] = useState(false)

  const handleWater = async () => {
    setLoading(true)
    try {
      await onWater(note)
      setNote('')
    } finally {
      setLoading(false)
    }
  }

  const handleUndo = async () => {
    setLoading(true)
    try {
      await onUndo()
      setShowUndo(false)
    } finally {
      setLoading(false)
    }
  }

  const isDone = todayWatering !== null

  return (
    <div className="space-y-4">
      {/* 今日の状態カード */}
      <div className={`rounded-2xl p-5 shadow-sm ${isDone ? 'bg-leaf-50 border border-leaf-200' : 'bg-terra-50 border-2 border-terra-400'}`}>
        <div className="flex items-center gap-3 mb-3">
          {isDone
            ? <CheckCircle className="text-leaf-500 shrink-0" size={28} />
            : <Droplets className="text-terra-500 shrink-0 animate-bounce" size={28} />
          }
          <div>
            <p className="text-sm font-medium text-soil-500">{formatDate(today())}</p>
            <h2 className={`text-xl font-bold ${isDone ? 'text-leaf-700' : 'text-terra-600'}`}>
              {isDone ? '水やり完了 ✔' : '⚠ まだ水やりしていません'}
            </h2>
          </div>
        </div>

        {isDone && todayWatering && (
          <div className="bg-white/60 rounded-xl p-3 text-sm text-soil-600 space-y-1">
            <p><span className="font-bold">{todayWatering.by_name}</span> さんが <span className="font-bold">{formatTime(todayWatering.created_at)}</span> に対応</p>
            {todayWatering.note && <p className="text-soil-400">「{todayWatering.note}」</p>}
          </div>
        )}

        {!isDone && (
          <p className="text-sm text-terra-600 mt-1">
            今日の担当:{' '}
            <span className="font-bold">
              {todayShift ? todayShift.names.join('・') : '担当未定'}
            </span>
          </p>
        )}
      </div>

      {/* 水やりボタン / 取り消し */}
      {!isDone ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
          <p className="text-sm text-soil-500 font-medium">水やりを記録する（{userName}）</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ（任意）: 例「トマトに多めにあげた」"
            rows={2}
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
          />
          <button
            onClick={handleWater}
            disabled={loading}
            className="w-full bg-leaf-500 text-white font-bold py-3 rounded-xl text-base active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Droplets size={20} />
            {loading ? '記録中...' : '水やりしたよ！'}
          </button>
        </div>
      ) : (
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
                  <Trash2 size={14} />
                  取り消す
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 明日の担当 */}
      {tomorrowShift && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
          <p className="text-xs text-soil-400 mb-1">明日（{formatDate(tomorrow())}）の担当</p>
          <p className="text-base font-bold text-soil-700">
            🌿 {tomorrowShift.names.join('・')}
          </p>
        </div>
      )}
    </div>
  )
}
