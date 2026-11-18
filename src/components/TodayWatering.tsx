import { useState } from 'react'
import { Trash2, Gamepad2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'
import {
  GardenScene, SunIcon, MoonIcon, WateringCanIcon, RainCloudIcon, type SceneState,
} from './illust/Illust'

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

function shiftNames(shift: Shift | null, slot: 'morning' | 'evening'): string {
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  return names.length > 0 ? names.join('・') : '担当なし'
}

/** 野菜なぞりゲーム（今日「水やりした」人だけ遊べる） */
const GAME_URL = 'https://yasai-nazori.vercel.app/'

interface SlotCardProps {
  userName: string
  slot: 'morning' | 'evening'
  watering: Watering | null
  todayShift: Shift | null
  onWater: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onRain: (note: string, slot: 'morning' | 'evening') => Promise<void>
  onUndo: (slot: 'morning' | 'evening') => Promise<void>
}

function SlotCard({ userName, slot, watering, todayShift, onWater, onRain, onUndo }: SlotCardProps) {
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showUndo, setShowUndo] = useState(false)

  const status = watering?.status ?? null
  const scene: SceneState = status === null ? 'todo' : status === 'watered' ? 'done' : 'rain'
  const night = slot === 'evening'
  const label = night ? '夜の水やり' : '朝の水やり'

  const headline = status === null
    ? 'まだ水やりしていません'
    : status === 'watered' ? '水やりおわり！' : '雨だったのでお休み'

  const badge = status === null
    ? <span className="shrink-0 rounded-full border-2 border-ink bg-sun px-3 py-0.5 text-xs lg:text-sm font-bold">まだ</span>
    : status === 'watered'
      ? <span className="shrink-0 rounded-full border-2 border-ink bg-grass px-3 py-0.5 text-xs lg:text-sm font-bold">済み</span>
      : <span className="shrink-0 rounded-full border-2 border-ink bg-sky px-3 py-0.5 text-xs lg:text-sm font-bold">雨</span>

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  const isRecorder = status !== null && watering!.by_name.split('・').map(n => n.trim()).includes(userName)

  return (
    <section className="hand-card overflow-hidden">
      {/* 今の様子がひと目でわかる挿絵 */}
      <div className="border-b-2 border-ink">
        <GardenScene state={scene} night={night} className="block w-full h-auto lg:h-56" />
      </div>

      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-1">
          {night ? <MoonIcon size={22} className="lg:w-7 lg:h-7" /> : <SunIcon size={22} className="lg:w-7 lg:h-7" />}
          <span className="text-sm lg:text-lg font-bold text-soil-500">{label}</span>
          <span className="flex-1" />
          {badge}
        </div>
        <h2 className="text-2xl lg:text-4xl font-black leading-tight mb-3 lg:mb-5">{headline}</h2>

        {/* 未対応：担当者と記録ボタン */}
        {status === null && (
          <>
            <p className="text-base lg:text-xl mb-4">
              <span className="text-soil-500 mr-3">今日の担当</span>
              <span className="font-black">{shiftNames(todayShift, slot)}</span>
            </p>
            <label className="block mb-3">
              <span className="sr-only">メモ（任意）</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="メモ（任意）例：代わりにやってくれた人"
                rows={1}
                className="w-full border-2 border-ink/25 rounded-xl px-3 py-2 lg:py-3 text-sm lg:text-base bg-paper placeholder:text-soil-400 focus:outline-none focus:border-ink resize-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <button
                onClick={() => wrap(() => onWater(note, slot).then(() => setNote('')))}
                disabled={loading}
                className="hand-btn bg-grass hover:bg-grass-dark font-black py-3 lg:py-5 flex items-center justify-center gap-2 text-base lg:text-2xl disabled:opacity-50"
              >
                <WateringCanIcon size={26} className="lg:w-9 lg:h-9" /> 水やりした
              </button>
              <button
                onClick={() => wrap(() => onRain(note, slot).then(() => setNote('')))}
                disabled={loading}
                className="hand-btn bg-sky hover:bg-sky-dark font-black py-3 lg:py-5 flex items-center justify-center gap-2 text-base lg:text-2xl disabled:opacity-50"
              >
                <RainCloudIcon size={26} className="lg:w-9 lg:h-9" /> 雨だった
              </button>
            </div>
          </>
        )}

        {/* 記録済み：だれが・いつ */}
        {watering && (
          <div className="rounded-xl bg-paper border-2 border-ink/15 px-4 py-3 text-base lg:text-xl">
            <p>
              <span className="font-black">{watering.by_name}</span>
              <span className="text-soil-500"> さんが </span>
              <span className="font-black">{formatTime(watering.created_at)}</span>
              <span className="text-soil-500">{status === 'watered' ? ' に水やりしました' : ' に雨と記録しました'}</span>
            </p>
            {watering.note && <p className="text-soil-500 mt-1 text-sm lg:text-lg">「{watering.note}」</p>}
          </div>
        )}

        {/* 記録した本人にだけ：ゲームへの入口 */}
        {isRecorder && (
          <a
            href={`${GAME_URL}?name=${encodeURIComponent(userName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hand-btn mt-4 flex items-center justify-center gap-2 w-full bg-sun font-black py-3 lg:py-4 text-base lg:text-xl"
          >
            <Gamepad2 size={20} className="lg:w-7 lg:h-7" /> ごほうびゲームで遊ぶ
          </a>
        )}

        {/* 記録済み：取り消し */}
        {status !== null && (
          <div className="mt-3 text-center">
            {!showUndo ? (
              <button
                onClick={() => setShowUndo(true)}
                className="text-xs lg:text-sm text-soil-500 underline underline-offset-2 py-2 px-3"
              >
                記録を取り消す
              </button>
            ) : (
              <div className="rounded-xl p-3 border-2 border-ink bg-terra-50 space-y-2">
                <p className="text-sm font-bold">本当に取り消しますか？</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUndo(false)}
                    className="flex-1 py-2 rounded-lg border-2 border-ink/30 bg-white text-sm"
                  >やめる</button>
                  <button
                    onClick={() => wrap(() => onUndo(slot).then(() => setShowUndo(false)))}
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg border-2 border-ink bg-clay text-sm font-bold flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> 取り消す
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
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
    <div className="space-y-4 lg:space-y-5">

      {/* 日付ヘッダー */}
      <div className="px-1 flex items-end justify-between gap-2">
        <div>
          <p className="text-sm lg:text-lg font-bold text-soil-500">今日の水やり</p>
          <p className="text-2xl lg:text-4xl font-black">{formatDate(todayStr)}</p>
        </div>
        <p className="text-xs lg:text-sm text-soil-500 pb-1">記録する人：{userName}</p>
      </div>

      <SlotCard
        userName={userName}
        slot="morning"
        watering={todayMorningWatering}
        todayShift={todayShift}
        onWater={onWater}
        onRain={onRain}
        onUndo={onUndo}
      />

      {/* 夜枠（2枠制の日のみ表示） */}
      {showEvening && (
        <SlotCard
          userName={userName}
          slot="evening"
          watering={todayEveningWatering}
          todayShift={todayShift}
          onWater={onWater}
          onRain={onRain}
          onUndo={onUndo}
        />
      )}

      {/* 明日の担当 */}
      <section className="hand-card p-4 lg:p-5">
        <p className="text-sm lg:text-base font-bold text-soil-500 mb-2">あした（{formatDate(tomorrowStr)}）の担当</p>
        <div className="space-y-1.5 text-base lg:text-xl">
          <div className="flex items-center gap-2">
            <SunIcon size={22} />
            <span className="text-soil-500 shrink-0">朝</span>
            <span className="font-black">{shiftNames(tomorrowShift, 'morning')}</span>
          </div>
          {showTomorrowEvening && (
            <div className="flex items-center gap-2">
              <MoonIcon size={22} />
              <span className="text-soil-500 shrink-0">夜</span>
              <span className="font-black">{shiftNames(tomorrowShift, 'evening')}</span>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
