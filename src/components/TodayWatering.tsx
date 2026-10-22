import { useState } from 'react'
import { Droplets, CheckCircle, CloudRain, Trash2, Gamepad2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'

interface Props {
  userName: string
  todayMorningWatering: Watering | null
  todayEveningWatering: Watering | null
  todayShift: Shift | null
  tomorrowShift: Shift | null
  onWater: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onRain: (note: string, slot: 'morning' | 'evening') => Promise<void>
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

/** 野菜なぞりゲーム（今日「水やりした」人だけ遊べる） */
const GAME_URL = 'https://yasai-nazori.vercel.app/'

interface SlotCardProps {
  userName: string
  label: string
  emoji: string
  watering: Watering | null
  slot: 'morning' | 'evening'
  todayShift: Shift | null
  onWater: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onRain: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onUndo: (slot: 'morning' | 'evening') => Promise<void>
}

function SlotCard({ userName, label, emoji, watering, slot, todayShift, onWater, onRain, onUndo }: SlotCardProps) {
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
    ? <Droplets className="text-terra-500 shrink-0 lg:w-9 lg:h-9" size={22} />
    : status === 'watered'
      ? <CheckCircle className="text-leaf-500 shrink-0 lg:w-9 lg:h-9" size={22} />
      : <CloudRain className="text-blue-400 shrink-0 lg:w-9 lg:h-9" size={22} />

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
    <div className={`rounded-2xl p-4 lg:p-6 shadow-sm ${cardBg}`}>
      {/* スロットヘッダー */}
      <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
        {icon}
        <div className="flex-1">
          <p className="text-xs lg:text-base text-soil-400">{emoji} {label}</p>
          <p className={`font-bold text-base lg:text-3xl ${headlineColor}`}>{headline}</p>
        </div>
      </div>

      {/* 記録済み：誰が対応したか */}
      {watering && (
        <div className="bg-white/60 rounded-xl px-3 py-2 lg:px-4 lg:py-3 text-sm lg:text-lg text-soil-600 space-y-0.5">
          <p>
            <span className="font-bold">{watering.by_name}</span>
            {' さんが '}
            <span className="font-bold">{formatTime(watering.created_at)}</span>
            {status === 'watered' ? ' に対応' : ' に雨と判断'}
          </p>
          {watering.note && <p className="text-soil-400">「{watering.note}」</p>}
        </div>
      )}

      {/* 未対応：担当者表示 */}
      {status === null && (
        <p className="text-sm lg:text-xl text-soil-500 mb-3 lg:mb-4">
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
            className="w-full border border-soil-200 rounded-lg px-3 py-2 lg:py-3 text-sm lg:text-base text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
          />
          <div className="flex gap-2 lg:gap-3">
            <button
              onClick={() => wrap(() => onWater(note, slot).then(() => setNote('')))}
              disabled={loading}
              className="flex-1 bg-leaf-500 hover:bg-leaf-600 text-white font-bold py-2.5 lg:py-5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5 lg:gap-2 text-sm lg:text-xl"
            >
              <Droplets size={16} className="lg:w-6 lg:h-6" /> 水やりした
            </button>
            <button
              onClick={() => wrap(() => onRain(note, slot).then(() => setNote('')))}
              disabled={loading}
              className="flex-1 bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 lg:py-5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5 lg:gap-2 text-sm lg:text-xl"
            >
              <CloudRain size={16} className="lg:w-6 lg:h-6" /> 雨だった
            </button>
          </div>
        </div>
      )}

      {/* 記録した本人にだけ（水やりした・雨だった）：ゲームへの入口 */}
      {status !== null && watering!.by_name.split('・').map(n => n.trim()).includes(userName) && (
        <a
          href={`${GAME_URL}?name=${encodeURIComponent(userName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full bg-terra-500 hover:bg-terra-600 text-white font-bold py-2.5 lg:py-4 rounded-xl text-sm lg:text-lg active:scale-95 transition-transform"
        >
          <Gamepad2 size={18} className="lg:w-6 lg:h-6" /> ゲームで遊ぶ
        </a>
      )}

      {/* 記録済み：取り消し */}
      {status !== null && (
        <div className="mt-2 text-center">
          {!showUndo ? (
            <button
              onClick={() => setShowUndo(true)}
              className="text-xs lg:text-sm text-soil-400 underline underline-offset-2"
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
  const todayStr    = today()
  const tomorrowStr = tomorrow()

  // 朝／夜どちらの枠を出すかは wateringRule.ts の判定に従う。
  // 明日の担当は「明日の日付」で判定するので、ルール切り替え日の前日でも正しく2枠表示になる。
  const showEvening         = isDualSlotDate(todayStr)
  const showTomorrowEvening = isDualSlotDate(tomorrowStr)

  return (
    <div className="space-y-4">

      {/* 日付ヘッダー */}
      <div className="px-1">
        <p className="text-sm lg:text-2xl font-medium lg:font-bold text-soil-500 lg:text-soil-700">{formatDate(todayStr)} の水やり</p>
        <p className="text-xs lg:text-sm text-soil-400">記録者: {userName}</p>
      </div>

      {/* 朝枠 */}
      <SlotCard
        userName={userName}
        label="朝の水やり"
        emoji="☀️"
        watering={todayMorningWatering}
        slot="morning"
        todayShift={todayShift}
        onWater={onWater}
        onRain={onRain}
        onUndo={onUndo}
      />

      {/* 夜枠（2枠制の日のみ表示） */}
      {showEvening && (
        <SlotCard
          userName={userName}
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
      <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-soil-100">
        <p className="text-xs lg:text-sm text-soil-400 mb-2">明日（{formatDate(tomorrowStr)}）の担当</p>
        <div className="space-y-1 text-sm lg:text-lg">
          <div className="flex items-baseline gap-1.5">
            <span className="text-soil-400 shrink-0">☀️ 朝:</span>
            <ShiftNames shift={tomorrowShift} slot="morning" />
          </div>
          {showTomorrowEvening && (
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
