import { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { DoneMark, MissMark, TodoMark, RainCloudIcon, SunIcon, MoonIcon } from './illust/Illust'
import { formatDate, today } from '../lib/utils'
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

function Names({ names }: { names: string[] }) {
  return (
    <span className={`text-sm ${names.length > 0 ? 'font-bold' : 'text-soil-400'}`}>
      {names.length > 0 ? names.join('・') : '担当なし'}
    </span>
  )
}

function StatusBadge({ watering, compact = false, pending = false }: { watering: Watering | null; compact?: boolean; pending?: boolean }) {
  const sz = compact ? 18 : 22
  const text = compact ? 'text-sm' : 'text-base'
  if (watering) {
    const rain = watering.status === 'rain'
    return (
      <div className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          {rain ? <RainCloudIcon size={sz + 2} title="雨" /> : <DoneMark size={sz} title="水やり済み" />}
          <span className={`${text} font-bold`}>{watering.by_name}</span>
          {rain && <span className="text-xs font-bold bg-sky border border-ink rounded-full px-1.5">雨</span>}
        </div>
        {watering.note && (
          <p className="text-xs text-soil-500 mt-0.5">「{watering.note}」</p>
        )}
      </div>
    )
  }
  if (pending) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <TodoMark size={sz} title="まだ" />
        <span className={`${text} font-bold`}>まだ</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <MissMark size={sz} title="記録なし" />
      <span className={`${text} text-terra-700 font-bold`}>記録なし</span>
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
}

export function WateringHistory({ history, shifts, pastDays, hasMore, loadingMore, onLoadMore }: Props) {
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
    <div className="hand-card overflow-hidden">
      {/* 凡例 */}
      <div className="px-4 py-2.5 border-b-2 border-ink bg-paper flex items-center gap-4 flex-wrap text-xs font-bold">
        <span className="flex items-center gap-1"><DoneMark size={16} /> 水やり済み</span>
        <span className="flex items-center gap-1"><RainCloudIcon size={18} /> 雨</span>
        <span className="flex items-center gap-1"><MissMark size={16} /> 記録なし</span>
      </div>
      <ul>
        {dates.map(date => {
          const isToday  = date === todayStr
          const isFuture = date > todayStr
          // 未来の担当予定／過去の実績どちらも、その日のルールで朝夜2行か1行かを決める
          const dual     = isDualSlotDate(date)

          // ── 未来: 担当予定 ─────────────────────────────
          if (isFuture) {
            const shift        = shifts.find(s => s.date === date)
            const morningNames = shift?.morning_names ?? []
            const eveningNames = shift?.evening_names ?? []

            return (
              <li key={date} className="border-b border-ink/10 last:border-0 px-4 py-2 bg-paper/60">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-soil-500 border border-soil-300 rounded-full px-1.5 leading-4">予定</span>
                    <span className="text-sm text-soil-500">{formatDate(date)}</span>
                  </span>
                  {dual ? (
                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <SunIcon size={16} title="朝" />
                        <Names names={morningNames} />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <MoonIcon size={16} title="夜" />
                        <Names names={eveningNames} />
                      </div>
                    </div>
                  ) : (
                    <Names names={morningNames} />
                  )}
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
              className={`border-b border-ink/10 last:border-0 px-4 ${isToday ? 'bg-sun/30 py-3 border-y-2 border-y-ink' : 'py-2.5'}`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* 日付ラベル */}
                <div className="flex items-center gap-2 shrink-0">
                  {isToday && (
                    <span className="bg-sun border-2 border-ink text-xs font-black px-2 py-0.5 rounded-full leading-none">
                      今日
                    </span>
                  )}
                  <span className={`text-sm ${isToday ? 'font-black' : 'font-bold'}`}>
                    {formatDate(date)}
                  </span>
                </div>

                {/* 実績 */}
                {dual ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <SunIcon size={16} title="朝" />
                      <StatusBadge watering={morning} compact pending={isToday} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MoonIcon size={16} title="夜" />
                      <StatusBadge watering={evening} compact pending={isToday} />
                    </div>
                  </div>
                ) : (
                  <StatusBadge watering={morning} pending={isToday} />
                )}
              </div>
            </li>
          )
        })}

        {/* 読み込みトリガー / 終端表示 */}
        <li ref={sentinelRef} className="px-4 py-3 text-center border-t border-ink/10">
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
