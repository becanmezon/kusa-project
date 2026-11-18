import { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { DoneMark, MissMark, TodoMark, RainCloudIcon } from './illust/Illust'
import { SlotChip } from './SlotChip'
import { today } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'
import type { Watering, Shift } from '../types'
import type { HistoryEntry } from '../lib/db'

/** 未来に表示する日数（1週間先まで） */
const FUTURE_DAYS = 7

/** today+FUTURE_DAYS → today-pastDays の日付を返す（上が未来、下が過去） */
function buildTimeline(baseStr: string, pastDays: number): string[] {
  const [y, m, d] = baseStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: FUTURE_DAYS + 1 + pastDays }, (_, i) => {
    const date = new Date(base)
    date.setDate(date.getDate() + FUTURE_DAYS - i)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
}

type SlotKind = 'morning' | 'evening'

/**
 * 1枠ぶんの行。列を固定して、どの日もマークと名前が同じ位置に並ぶようにする
 * [朝/夜] [マーク] [名前・メモ]
 */
function SlotLine({ slot, showSlot, icon, children }: {
  slot: SlotKind
  showSlot: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[1.5rem_1.5rem_minmax(0,1fr)] items-start gap-x-2 min-h-6">
      <span>{showSlot && <SlotChip slot={slot} />}</span>
      <span className="flex items-center justify-center h-6">{icon}</span>
      <div className="min-w-0 leading-6">{children}</div>
    </div>
  )
}

/** 予定（これからの担当） */
function PlanLine({ slot, showSlot, names }: { slot: SlotKind; showSlot: boolean; names: string[] }) {
  return (
    <SlotLine slot={slot} showSlot={showSlot} icon={null}>
      <span className="text-sm text-soil-400">
        {names.length > 0 ? names.join('・') : '担当なし'}
      </span>
    </SlotLine>
  )
}

/** 実績（今日・これまで） */
function RecordLine({ slot, showSlot, watering, pending }: {
  slot: SlotKind
  showSlot: boolean
  watering: Watering | null
  pending: boolean
}) {
  if (watering) {
    const rain = watering.status === 'rain'
    return (
      <SlotLine
        slot={slot}
        showSlot={showSlot}
        icon={rain ? <RainCloudIcon size={22} title="雨" /> : <DoneMark size={19} title="水やり済み" />}
      >
        <span className="text-sm font-bold">{watering.by_name}</span>
        {watering.note && <p className="text-xs text-soil-500 leading-snug pb-1">「{watering.note}」</p>}
      </SlotLine>
    )
  }
  if (pending) {
    return (
      <SlotLine slot={slot} showSlot={showSlot} icon={<TodoMark size={19} title="まだ" />}>
        <span className="text-sm font-bold">まだ</span>
      </SlotLine>
    )
  }
  return (
    <SlotLine slot={slot} showSlot={showSlot} icon={<MissMark size={19} title="記録なし" />}>
      <span className="text-sm font-bold text-terra-700">記録なし</span>
    </SlotLine>
  )
}

/** 日付の列（固定幅） */
function DateCell({ date, tag }: { date: string; tag: 'today' | 'plan' | null }) {
  const [y, month, day] = date.split('-').map(Number)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, month - 1, day).getDay()]
  return (
    <div
      className={`leading-6 text-sm tabular-nums whitespace-nowrap ${
        tag === 'plan' ? 'text-soil-400' : tag === 'today' ? 'font-black' : 'font-bold'
      }`}
      aria-current={tag === 'today' ? 'date' : undefined}
    >
      <span className="inline-block w-[2.4em] text-right">{month}月</span>
      <span className="inline-block w-[2.4em] text-right">{day}日</span>
      <span className="inline-block w-[1.8em] text-center">({weekday})</span>
    </div>
  )
}

interface Props {
  history: HistoryEntry[]
  shifts: Shift[]
  pastDays: number
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  /** 親の高さいっぱいに広げ、中の一覧だけをスクロールさせる（PCの右側パネル用） */
  fill?: boolean
}

export function WateringHistory({ history, shifts, pastDays, hasMore, loadingMore, onLoadMore, fill = false }: Props) {
  const todayStr    = today()
  const dates       = buildTimeline(todayStr, pastDays)
  const todayRef    = useRef<HTMLLIElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = todayRef.current
      if (!el) return
      // スクロール可能な祖先を探す
      let parent = el.parentElement
      while (parent) {
        const oy = getComputedStyle(parent).overflowY
        if (oy === 'auto' || oy === 'scroll') break
        parent = parent.parentElement
      }
      if (!parent) return
      // 「今日」行をコンテナ上端から 1/3 の位置に合わせる
      const parentRect = parent.getBoundingClientRect()
      const elRect     = el.getBoundingClientRect()
      const current    = elRect.top - parentRect.top   // 現在の相対位置
      const target     = parentRect.height / 3         // 目標位置（上から 1/3）
      parent.scrollTop += current - target
    })
    return () => cancelAnimationFrame(id)
  }, [])

  // 一番下までスクロールしたら、さらに過去の記録を読み込む
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) onLoadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  return (
    <div className={`soft-card overflow-hidden ${fill ? 'h-full flex flex-col' : ''}`}>
      {/* 凡例 */}
      <div className="shrink-0 px-4 lg:px-6 py-2 border-b border-ink/20 bg-paper flex items-center gap-4 flex-wrap text-xs font-bold">
        <span className="flex items-center gap-1"><DoneMark size={16} /> 水やり済み</span>
        <span className="flex items-center gap-1"><RainCloudIcon size={18} /> 雨</span>
        <span className="flex items-center gap-1"><MissMark size={16} /> 記録なし</span>
      </div>
      <ul className={fill ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
        {dates.map(date => {
          const isToday  = date === todayStr
          const isFuture = date > todayStr
          // 未来の担当予定／過去の実績どちらも、その日のルールで朝夜2行か1行かを決める
          const dual     = isDualSlotDate(date)

          const rowGrid = 'grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 items-start px-4 lg:px-6'

          // ── 未来: 担当予定 ─────────────────────────────
          if (isFuture) {
            const shift = shifts.find(s => s.date === date)
            return (
              <li key={date} className={`${rowGrid} border-b border-ink/10 last:border-0 py-2`}>
                <DateCell date={date} tag="plan" />
                <div className="space-y-1">
                  <PlanLine slot="morning" showSlot={dual} names={shift?.morning_names ?? []} />
                  {dual && <PlanLine slot="evening" showSlot names={shift?.evening_names ?? []} />}
                </div>
              </li>
            )
          }

          // ── 今日・過去: 実績 ───────────────────────────
          const entry   = history.find(h => h.date === date)
          const morning = entry?.morning ?? null
          const evening = entry?.evening ?? null

          return (
            <li
              key={date}
              ref={isToday ? todayRef : undefined}
              className={`${rowGrid} border-b border-ink/10 last:border-0 ${isToday ? 'bg-sun/40 py-3' : 'py-2'}`}
            >
              <DateCell date={date} tag={isToday ? 'today' : null} />
              <div className="space-y-1">
                <RecordLine slot="morning" showSlot={dual} watering={morning} pending={isToday} />
                {dual && <RecordLine slot="evening" showSlot watering={evening} pending={isToday} />}
              </div>
            </li>
          )
        })}

        {/* 読み込みトリガー / 終端表示 */}
        <li ref={sentinelRef} className="px-4 lg:px-6 py-3 text-center border-t border-ink/10">
          {loadingMore ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-soil-400">
              <Loader2 size={14} className="animate-spin" />
              過去の記録を読み込み中...
            </span>
          ) : !hasMore ? (
            <span className="text-xs text-soil-500">これより前の記録はありません</span>
          ) : null}
        </li>
      </ul>

    </div>
  )
}
