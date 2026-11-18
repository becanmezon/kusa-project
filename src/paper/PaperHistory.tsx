// 紙の版：水やり当番表（履歴）
// 日付・朝夜・担当・状態の列をそろえた表組み。今日は太い罫線と手描きの丸で示す
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { today } from '../lib/utils'
import { isDualSlotDate } from '../lib/wateringRule'
import type { Shift, Watering } from '../types'
import type { HistoryEntry } from '../lib/db'
import { StatePill } from './PaperToday'
import { HandCircle } from './HandDrawn'

const FUTURE_DAYS = 7

function buildTimeline(baseStr: string, pastDays: number): string[] {
  const [y, m, d] = baseStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: FUTURE_DAYS + 1 + pastDays }, (_, i) => {
    const date = new Date(base)
    date.setDate(date.getDate() + FUTURE_DAYS - i)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

/** 日付を「11/18 水」の形で、月・日を等幅でそろえる */
function DateText({ date }: { date: string }) {
  const [y, m, d] = date.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  return (
    <span className="p-num whitespace-nowrap">
      <span className="inline-block w-[2ch] text-right">{m}</span>/<span className="inline-block w-[2ch]">{String(d).padStart(2, ' ')}</span>
      <span className="ml-1.5">{WEEK[wd]}</span>
    </span>
  )
}

interface Props {
  history: HistoryEntry[]
  shifts: Shift[]
  pastDays: number
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  fill?: boolean
  summaryHref?: string
}

type Slot = 'morning' | 'evening'

export function PaperHistory({ history, shifts, pastDays, hasMore, loadingMore, onLoadMore, fill = false, summaryHref }: Props) {
  const todayStr = today()
  const dates = buildTimeline(todayStr, pastDays)
  const todayRef = useRef<HTMLTableSectionElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 「今日」の行が上から1/3あたりに来るようにスクロール
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = todayRef.current
      if (!el) return
      let parent: HTMLElement | null = scrollRef.current
      if (!fill) {
        parent = el.parentElement
        while (parent) {
          const oy = getComputedStyle(parent).overflowY
          if (oy === 'auto' || oy === 'scroll') break
          parent = parent.parentElement
        }
      }
      if (parent) {
        const pr = parent.getBoundingClientRect()
        parent.scrollTop += el.getBoundingClientRect().top - pr.top - pr.height / 3
      } else {
        const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3
        window.scrollTo({ top })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [fill])

  // いちばん下まで来たら、さらに過去を読み込む
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loadingMore) onLoadMore() }, { rootMargin: '200px' })
    ob.observe(el)
    return () => ob.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  const th = 'text-left font-bold text-xs tracking-widest p-sub py-2 px-2 first:pl-0 last:pr-0'
  const td = 'py-2 px-2 first:pl-0 last:pr-0 align-top'

  return (
    <div className={fill ? 'h-full flex flex-col min-h-0' : ''}>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="p-head text-2xl lg:text-3xl">水やり当番表</h2>
        {summaryHref && (
          <Link to={summaryHref} className="text-sm lg:text-base font-bold underline underline-offset-4 whitespace-nowrap">
            月のまとめ →
          </Link>
        )}
      </div>

      <div ref={scrollRef} className={fill ? 'flex-1 min-h-0 overflow-y-auto pr-1' : ''}>
        <table className="w-full border-collapse text-[0.95rem]">
          <colgroup>
            <col className="w-[6.5rem]" />
            <col className="w-[2.5rem]" />
            <col />
            <col className="w-[6.5rem]" />
          </colgroup>
          <thead className={fill ? 'sticky top-0 bg-[var(--p-paper)] z-10' : ''}>
            <tr className="border-b-2 border-[var(--p-ink)]">
              <th className={th}>日付</th>
              <th className={th}>枠</th>
              <th className={th}>担当・記録</th>
              <th className={`${th} text-right`}>状態</th>
            </tr>
          </thead>

          {dates.map(date => {
            const isToday = date === todayStr
            const isFuture = date > todayStr
            const slots: Slot[] = isDualSlotDate(date) ? ['morning', 'evening'] : ['morning']
            const shift = shifts.find(s => s.date === date)
            const entry = history.find(h => h.date === date)

            return (
              <tbody
                key={date}
                ref={isToday ? todayRef : undefined}
                aria-current={isToday ? 'date' : undefined}
                className={isToday ? 'border-y-[3px] border-[var(--p-ink)]' : 'border-b p-rule'}
              >
                {slots.map((slot, i) => {
                  const planned = (slot === 'morning' ? shift?.morning_names : shift?.evening_names) ?? []
                  const rec: Watering | null = (slot === 'morning' ? entry?.morning : entry?.evening) ?? null
                  return (
                    <tr key={slot} className={isFuture ? 'p-faint' : ''}>
                      {i === 0 && (
                        <td rowSpan={slots.length} className={`${td} ${isToday ? 'font-bold' : ''}`}>
                          <span className="relative inline-block">
                            {isToday && <HandCircle className="absolute -inset-x-2.5 -inset-y-1.5 w-[calc(100%+1.25rem)] h-[calc(100%+0.75rem)]" />}
                            <DateText date={date} />
                          </span>
                        </td>
                      )}
                      <td className={`${td} ${slots.length > 1 ? '' : 'p-faint'}`}>{slot === 'morning' ? '朝' : '夜'}</td>
                      <td className={td}>
                        {rec ? (
                          <>
                            <span className="font-bold">{rec.by_name}</span>
                            {rec.note && <span className="block text-xs p-sub mt-0.5">「{rec.note}」</span>}
                          </>
                        ) : (
                          <span className={isFuture ? '' : 'p-sub'}>{planned.length > 0 ? planned.join('・') : '—'}</span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        {!isFuture && <StatePill status={rec?.status ?? null} pending={isToday} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )
          })}
        </table>

        <div ref={sentinelRef} className="py-4 text-center text-xs p-sub">
          {loadingMore ? '過去の記録を読み込み中…' : !hasMore ? 'これより前の記録はありません' : null}
        </div>
      </div>
    </div>
  )
}
