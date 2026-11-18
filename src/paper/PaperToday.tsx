// 紙の版：今日の水やり
// 主役は「日付」「状態」「誰がいつ記録したか」の3つ。文字の大きさだけで順番に読めるようにする
import { useState } from 'react'
import type { Watering, Shift } from '../types'
import { today, tomorrow, formatDate, formatTime } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'
import { SproutSketch, type PaperWeather } from './HandDrawn'

type Slot = 'morning' | 'evening'

interface Props {
  userName: string
  todayMorningWatering: Watering | null
  todayEveningWatering: Watering | null
  todayShift: Shift | null
  tomorrowShift: Shift | null
  onWater: (note: string, slot: Slot) => Promise<void>
  onRain: (note: string, slot: Slot) => Promise<void>
  onUndo: (slot: Slot) => Promise<void>
}

const GAME_URL = 'https://yasai-nazori.vercel.app/'

function shiftNames(shift: Shift | null, slot: Slot): string {
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  return names.length > 0 ? names.join('・') : '担当なし'
}

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${day})`
}

export function StatePill({ status, pending = false }: { status: 'watered' | 'rain' | null; pending?: boolean }) {
  if (status === 'watered') return <span className="p-state p-state-done">水やり済み</span>
  if (status === 'rain') return <span className="p-state p-state-rain">雨</span>
  if (pending) return <span className="p-state p-state-todo">まだ</span>
  return <span className="p-state p-state-miss">記録なし</span>
}

function SlotSection({ userName, slot, watering, todayShift, showSlotName, onWater, onRain, onUndo }: {
  userName: string
  slot: Slot
  watering: Watering | null
  todayShift: Shift | null
  showSlotName: boolean
  onWater: Props['onWater']
  onRain: Props['onRain']
  onUndo: Props['onUndo']
}) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const status = watering?.status ?? null

  const headline = status === null
    ? 'まだ水やりしていません'
    : status === 'watered' ? '水やりおわり！' : '雨だったのでお休み'

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }
  const isRecorder = !!watering && watering.by_name.split('・').map(n => n.trim()).includes(userName)

  return (
    <section className="py-6 lg:py-8 border-t p-rule">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <p className="text-sm lg:text-base font-bold tracking-widest p-sub">
          {showSlotName ? (slot === 'morning' ? '朝の水やり' : '夜の水やり') : '朝の水やり'}
        </p>
        <StatePill status={status} pending />
      </div>

      {/* 主役その2：状態 */}
      <h2 className="text-[1.75rem] lg:text-[2.75rem] font-bold leading-tight mb-3 lg:mb-4">{headline}</h2>

      {/* 主役その3：誰がいつ記録したか（箱で囲まない） */}
      {watering && (
        <>
          <p className="text-lg lg:text-2xl leading-snug">
            <span className="font-bold">{watering.by_name}</span>
            <span className="p-sub"> さんが </span>
            <span className="p-num font-bold">{formatTime(watering.created_at)}</span>
            <span className="p-sub">{status === 'watered' ? ' に水やりしました' : ' に雨と記録しました'}</span>
          </p>
          {watering.note && <p className="mt-1 text-base lg:text-lg p-sub">「{watering.note}」</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {!confirmUndo ? (
              <button onClick={() => setConfirmUndo(true)} className="p-sub underline underline-offset-4">
                記録を取り消す
              </button>
            ) : (
              <span className="flex flex-wrap items-center gap-3">
                <span className="font-bold">本当に取り消しますか？</span>
                <button
                  onClick={() => wrap(() => onUndo(slot).then(() => setConfirmUndo(false)))}
                  disabled={loading}
                  className="p-btn p-btn-plain px-3 py-1 disabled:opacity-50"
                  style={{ color: 'var(--p-miss)', borderColor: 'var(--p-miss)' }}
                >取り消す</button>
                <button onClick={() => setConfirmUndo(false)} className="underline underline-offset-4 p-sub">やめる</button>
              </span>
            )}
            {isRecorder && (
              <a
                href={`${GAME_URL}?name=${encodeURIComponent(userName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-4"
                style={{ color: 'var(--p-leaf)' }}
              >
                ごほうびゲームで遊ぶ →
              </a>
            )}
          </div>
        </>
      )}

      {/* 未記録：担当・メモ・記録ボタン */}
      {status === null && (
        <>
          <p className="text-lg lg:text-2xl mb-4">
            <span className="p-sub mr-3">今日の担当</span>
            <span className="font-bold">{shiftNames(todayShift, slot)}</span>
          </p>
          <label className="block mb-4">
            <span className="sr-only">メモ（任意）</span>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="メモ（任意）例：代わりにやってくれた人"
              className="p-input text-base"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 max-w-xl">
            <button
              onClick={() => wrap(() => onWater(note, slot).then(() => setNote('')))}
              disabled={loading}
              className="p-btn p-btn-primary py-3 lg:py-4 text-base lg:text-xl disabled:opacity-50"
            >
              水やりした
            </button>
            <button
              onClick={() => wrap(() => onRain(note, slot).then(() => setNote('')))}
              disabled={loading}
              className="p-btn p-btn-plain py-3 lg:py-4 text-base lg:text-xl disabled:opacity-50"
            >
              雨だった
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export function PaperToday(props: Props) {
  const { userName, todayMorningWatering, todayEveningWatering, todayShift, tomorrowShift } = props
  const todayStr = today()
  const tomorrowStr = tomorrow()
  const dual = isDualSlotDate(todayStr)
  const dualTomorrow = isDualSlotDate(tomorrowStr)

  // 線画の天気は朝の記録で決める（2枠の日は、まだの枠があれば「まだ」）
  const slots = dual ? [todayMorningWatering, todayEveningWatering] : [todayMorningWatering]
  const weather: PaperWeather = slots.some(w => !w) ? 'todo' : slots.every(w => w!.status === 'rain') ? 'rain' : 'done'

  return (
    <div>
      {/* 主役その1：日付 */}
      <header className="flex items-end justify-between gap-4 pb-4">
        <div className="min-w-0">
          <p className="text-sm lg:text-base font-bold tracking-[0.3em] p-sub mb-1">今日の水やり</p>
          <p className="p-head text-[2.75rem] leading-none lg:text-[4.5rem] whitespace-nowrap">{formatDate(todayStr)}</p>
        </div>
        <SproutSketch weather={weather} className="w-24 lg:w-36 shrink-0 -mb-1" />
      </header>

      <SlotSection {...props} userName={userName} slot="morning" watering={todayMorningWatering} todayShift={todayShift} showSlotName={dual} />
      {dual && (
        <SlotSection {...props} userName={userName} slot="evening" watering={todayEveningWatering} todayShift={todayShift} showSlotName />
      )}

      {/* あしたの担当：罫線で区切った1行 */}
      <section className="py-4 border-t p-rule">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 items-baseline text-base lg:text-xl">
          <dt className="font-bold">
            あしたの担当<span className="p-num p-sub font-normal ml-3 text-sm lg:text-base">{shortDate(tomorrowStr)}</span>
          </dt>
          <dd>
            {dualTomorrow ? (
              <span className="flex flex-wrap gap-x-6">
                <span><span className="p-sub mr-2">朝</span><span className="font-bold">{shiftNames(tomorrowShift, 'morning')}</span></span>
                <span><span className="p-sub mr-2">夜</span><span className="font-bold">{shiftNames(tomorrowShift, 'evening')}</span></span>
              </span>
            ) : (
              <span className="font-bold">{shiftNames(tomorrowShift, 'morning')}</span>
            )}
          </dd>
        </dl>
      </section>
    </div>
  )
}
