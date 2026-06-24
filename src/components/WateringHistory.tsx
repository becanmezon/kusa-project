import { useRef, useEffect } from 'react'
import { CheckCircle, XCircle, CloudRain } from 'lucide-react'
import { formatDate, today } from '../lib/utils'
import type { Watering, Shift } from '../types'
import type { HistoryEntry } from '../lib/db'

function isJulySept(dateStr: string): boolean {
  const month = parseInt(dateStr.split('-')[1], 10)
  return month >= 7 && month <= 9
}

/** today+14 → today-14 の 29日分を返す（上が未来、下が過去） */
function buildTimeline(baseStr: string): string[] {
  const [y, m, d] = baseStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: 29 }, (_, i) => {
    const date = new Date(base)
    date.setDate(date.getDate() + 14 - i)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
}

function Names({ names }: { names: string[] }) {
  return (
    <span className={`text-sm ${names.length > 0 ? 'text-soil-700 font-medium' : 'text-soil-300'}`}>
      {names.length > 0 ? names.join('・') : '人がいません'}
    </span>
  )
}

function StatusBadge({ watering, compact = false }: { watering: Watering | null; compact?: boolean }) {
  const sz = compact ? 13 : 15
  if (watering?.status === 'watered') {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle size={sz} className="text-leaf-500" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-leaf-700 font-medium`}>{watering.by_name}</span>
        <span className="text-xs text-leaf-400 bg-leaf-50 px-1.5 py-0.5 rounded-full">済</span>
      </div>
    )
  }
  if (watering?.status === 'rain') {
    return (
      <div className="flex items-center gap-1">
        <CloudRain size={sz} className="text-blue-400" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-blue-600 font-medium`}>{watering.by_name}</span>
        <span className="text-xs text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full">雨</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <XCircle size={sz} className="text-terra-400" />
      <span className={`${compact ? 'text-xs' : 'text-sm'} text-terra-500`}>未</span>
    </div>
  )
}

interface Props {
  history: HistoryEntry[]
  shifts: Shift[]
}

export function WateringHistory({ history, shifts }: Props) {
  const todayStr = today()
  const dates    = buildTimeline(todayStr)
  const todayRef = useRef<HTMLLIElement>(null)

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-soil-100 overflow-hidden">
      <ul>
        {dates.map(date => {
          const isToday  = date === todayStr
          const isFuture = date > todayStr
          const dual     = isJulySept(date)

          // ── 未来: 担当予定 ─────────────────────────────
          if (isFuture) {
            const shift        = shifts.find(s => s.date === date)
            const morningNames = shift?.morning_names ?? []
            const eveningNames = shift?.evening_names ?? []

            return (
              <li key={date} className="border-b border-soil-100 last:border-0 px-4 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-soil-400 shrink-0 w-28">{formatDate(date)}</span>
                  {dual ? (
                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-soil-400">🌅</span>
                        <Names names={morningNames} />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-soil-400">🌙</span>
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
              className={`border-b border-soil-100 last:border-0 px-4 ${isToday ? 'bg-leaf-50 py-3' : 'py-2'}`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* 日付ラベル */}
                <div className="flex items-center gap-2 shrink-0">
                  {isToday && (
                    <span className="bg-leaf-500 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
                      今日
                    </span>
                  )}
                  <span className={`text-sm ${isToday ? 'font-bold text-soil-800' : 'text-soil-600'}`}>
                    {formatDate(date)}
                  </span>
                </div>

                {/* 実績 */}
                {dual ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-soil-400 w-5">朝</span>
                      <StatusBadge watering={morning} compact />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-soil-400 w-5">夜</span>
                      <StatusBadge watering={evening} compact />
                    </div>
                  </div>
                ) : (
                  <StatusBadge watering={morning} />
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* 凡例 */}
      <div className="px-4 py-3 border-t border-soil-100 flex items-center gap-4">
        <span className="text-xs text-soil-400">実績:</span>
        <span className="flex items-center gap-1 text-xs text-soil-400">
          <CheckCircle size={12} className="text-leaf-500" /> 済
        </span>
        <span className="flex items-center gap-1 text-xs text-soil-400">
          <CloudRain size={12} className="text-blue-400" /> 雨
        </span>
        <span className="flex items-center gap-1 text-xs text-soil-400">
          <XCircle size={12} className="text-terra-400" /> 未
        </span>
      </div>
    </div>
  )
}
