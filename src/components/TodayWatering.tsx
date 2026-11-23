import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Trash2, Gamepad2 } from 'lucide-react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'
import {
  GardenScene, SunIcon, MoonIcon, WateringCanIcon, RainCloudIcon, UmbrellaIcon, type SceneState,
} from './illust/Illust'
import { SlotChip } from './SlotChip'
import { STATE_TONE } from './stateTone'
import { isPendingRecord } from '../lib/outbox'

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
    ? 'まだあげていません'
    : status === 'watered' ? '水やりしました' : '雨でお休み'

  // 状態ごとの色：カード下半分の地色とバッジ（済み＝緑、まだ＝コーラル、雨＝青）
  const tone = STATE_TONE[scene]
  const badge = (
    <span
      className="shrink-0 rounded-full border-2 border-ink px-3 py-1 text-xs lg:text-sm font-black leading-none"
      style={{ backgroundColor: tone.badge }}
    >
      {tone.label}
    </span>
  )

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  const isRecorder = status !== null && watering!.by_name.split('・').map(n => n.trim()).includes(userName)

  return (
    <section className="hand-card overflow-hidden">
      {/* 今の様子がひと目でわかる挿絵（切らずに全体を収める） */}
      <div className="border-b-2 border-ink">
        <GardenScene state={scene} night={night} className="w-full aspect-[12/5] lg:aspect-auto lg:h-[clamp(7rem,26vh,15rem)]" />
      </div>

      {/* スマホは中央揃え、PCは左揃え */}
      <div className="px-4 pt-5 pb-3 lg:p-6 short:px-6 short:py-4 text-center lg:text-left" style={{ backgroundColor: tone.bg }}>
        <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
          {night ? <MoonIcon size={22} className="lg:w-7 lg:h-7" /> : <SunIcon size={22} className="lg:w-7 lg:h-7" />}
          <span className="text-sm lg:text-lg font-bold text-ink/70">{label}</span>
          <span className="hidden lg:block flex-1" />
          {badge}
        </div>
        <h2 className="text-[1.875rem] lg:text-4xl short:text-3xl font-black leading-tight mb-4 short:mb-2 flex items-center justify-center lg:justify-start gap-2">
          {status === 'rain' && <UmbrellaIcon size={32} className="shrink-0 lg:w-10 lg:h-10" />}
          {headline}
        </h2>

        {/* 未対応：担当者と記録ボタン */}
        {status === null && (
          <>
            <p className="text-base lg:text-xl mb-4 short:mb-3">
              {/* スマホは「今日の担当は」のあとで改行（モックに合わせる） */}
              <span className="text-ink/70">今日の担当は</span>
              <br className="lg:hidden" />
              <span className="hidden lg:inline"> </span>
              <span className="font-black">{shiftNames(todayShift, slot)}</span>
              {todayShift && (slot === 'morning' ? todayShift.morning_names : todayShift.evening_names).length > 0 && (
                <span className="text-ink/70"> さん</span>
              )}
            </p>
            <label className="block mb-4 short:mb-3">
              <span className="sr-only">メモ（任意）</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="メモ（任意）例：代わりにやってくれた人"
                rows={1}
                className="w-full border-2 border-ink/25 rounded-xl px-4 py-2 lg:py-3 short:py-2 text-sm lg:text-base bg-white/70 placeholder:text-soil-400 text-left focus:outline-none focus:border-ink resize-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => wrap(() => onWater(note, slot).then(() => setNote('')))}
                disabled={loading}
                className="hand-btn bg-grass hover:bg-grass-dark font-black py-3 lg:py-5 short:py-3 flex items-center justify-center gap-2 text-base lg:text-2xl short:text-xl disabled:opacity-50"
              >
                <WateringCanIcon size={26} className="lg:w-9 lg:h-9" /> 水やりした
              </button>
              <button
                onClick={() => wrap(() => onRain(note, slot).then(() => setNote('')))}
                disabled={loading}
                className="hand-btn bg-sky hover:bg-sky-dark font-black py-3 lg:py-5 short:py-3 flex items-center justify-center gap-2 text-base lg:text-2xl short:text-xl disabled:opacity-50"
              >
                <RainCloudIcon size={26} className="lg:w-9 lg:h-9" /> 雨だった
              </button>
            </div>
          </>
        )}

        {/* 記録済み：だれが・いつ（箱で囲まず、文字の強弱だけで見せる） */}
        {watering && (
          <div className="text-base lg:text-xl leading-relaxed">
            <p>
              {/* スマホは「〜さんが」のあとで改行、PCは1行 */}
              <span className="font-black">{watering.by_name}</span>
              <span className="text-ink/70"> さんが</span>
              <br className="lg:hidden" />
              <span className="hidden lg:inline"> </span>
              <span className="font-black tabular-nums">{formatTime(watering.created_at)}</span>
              <span className="text-ink/70">{status === 'watered' ? ' に水やりしました' : ' に雨と記録しました'}</span>
            </p>
            {watering.note && <p className="text-ink/70 mt-1 text-sm lg:text-lg">「{watering.note}」</p>}
            {isPendingRecord(watering) && (
              <p className="mt-1 text-sm font-bold text-ink/70">まだ送信されていません（つながったら自動で送信します）</p>
            )}
          </div>
        )}

        {/* 記録済み：取り消し（スマホは中央・押しやすい高さ、PCは記録者の行の直下に左揃え） */}
        {status !== null && (
          <div className="mt-1 text-[0.8125rem] lg:text-sm">
            {!showUndo ? (
              <button
                onClick={() => setShowUndo(true)}
                className="font-bold text-ink/70 underline underline-offset-4 min-h-11 px-3 lg:px-0 lg:min-h-0 lg:py-1"
              >
                記録を取り消す
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 py-2">
                <span className="font-bold mr-2">本当に取り消しますか？</span>
                <button
                  onClick={() => wrap(() => onUndo(slot).then(() => setShowUndo(false)))}
                  disabled={loading}
                  className="rounded-full border-2 border-ink bg-clay font-bold px-4 py-1 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 size={14} /> 取り消す
                </button>
                <button
                  onClick={() => setShowUndo(false)}
                  className="rounded-full border-2 border-ink/30 bg-white px-4 py-1"
                >やめる</button>
              </div>
            )}
          </div>
        )}

        {/* 記録した本人にだけ：野菜キャッチへの入口（PC専用のゲームなのでスマホでは出さない） */}
        {isRecorder && (
          <Link
            to="/catch"
            className="hand-btn mt-4 hidden lg:flex items-center justify-center gap-2 w-full bg-sun font-black py-3 lg:py-4 text-base lg:text-xl"
          >
            <Gamepad2 size={20} className="lg:w-7 lg:h-7" /> 野菜キャッチで遊ぶ
          </Link>
        )}
      </div>
    </section>
  )
}

/** "YYYY-MM-DD" → "M/D(曜)" */
function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${day})`
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
    <div className="space-y-4 short:space-y-3">

      {/* 日付ヘッダー（記録する人の名前は画面上部のヘッダーに表示） */}
      <div className="px-1 lg:flex lg:items-center lg:gap-4">
        {/* マスキングテープを貼ったような見出し */}
        <p className="inline-block -rotate-2 bg-sun/80 border-x-2 border-dashed border-ink/25 px-3 py-1 text-sm lg:text-lg short:text-base font-black tracking-wider">
          今日の水やり
        </p>
        <p className="text-3xl lg:text-5xl short:text-4xl font-black mt-2 lg:mt-0 tracking-tight tabular-nums">{formatDate(todayStr)}</p>
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

      {/* 明日の担当（脇役なので、影なし・細い線で軽く） */}
      <section className="soft-card p-4 lg:p-6">
        <p className="text-sm lg:text-base text-soil-500 mb-2">
          <span className="font-bold mr-2">あしたの担当</span>
          <span className="tabular-nums">{shortDate(tomorrowStr)}</span>
        </p>
        <div className="space-y-2 text-base lg:text-xl">
          <div className="flex items-center gap-2">
            <SlotChip slot="morning" />
            <span className="font-black">{shiftNames(tomorrowShift, 'morning')}</span>
          </div>
          {showTomorrowEvening && (
            <div className="flex items-center gap-2">
              <SlotChip slot="evening" />
              <span className="font-black">{shiftNames(tomorrowShift, 'evening')}</span>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
