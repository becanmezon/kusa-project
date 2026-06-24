import { CheckCircle, XCircle, CloudRain, CalendarDays, ClipboardList } from 'lucide-react'
import { formatDate, today } from '../lib/utils'
import type { Watering, Shift } from '../types'
import type { HistoryEntry } from '../lib/db'

function isJulySept(dateStr: string): boolean {
  const month = parseInt(dateStr.split('-')[1], 10)
  return month >= 7 && month <= 9
}

function futureDates(baseStr: string, count = 14): string[] {
  const [y, m, d] = baseStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(base)
    date.setDate(date.getDate() + i + 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
}

function Names({ names }: { names: string[] }) {
  return (
    <span className={`text-sm font-medium ${names.length > 0 ? 'text-soil-700' : 'text-soil-300'}`}>
      {names.length > 0 ? names.join('・') : '人がいません'}
    </span>
  )
}

function StatusBadge({ watering, compact = false }: { watering: Watering | null; compact?: boolean }) {
  if (watering?.status === 'watered') {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle size={compact ? 13 : 15} className="text-leaf-500" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-leaf-700 font-medium`}>
          {watering.by_name}
        </span>
        <span className="text-xs text-leaf-400 bg-leaf-50 px-1.5 py-0.5 rounded-full">済</span>
      </div>
    )
  }
  if (watering?.status === 'rain') {
    return (
      <div className="flex items-center gap-1">
        <CloudRain size={compact ? 13 : 15} className="text-blue-400" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-blue-600 font-medium`}>
          {watering.by_name}
        </span>
        <span className="text-xs text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full">雨</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <XCircle size={compact ? 13 : 15} className="text-terra-400" />
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
  const upcoming = futureDates(todayStr)

  return (
    <div className="space-y-4">

      {/* ── これからの担当 ────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-leaf-500" />
          <h2 className="font-bold text-soil-700">これからの担当（2週間）</h2>
        </div>
        <ul className="space-y-0">
          {upcoming.map(date => {
            const shift = shifts.find(s => s.date === date)
            const dual  = isJulySept(date)
            const morningNames = shift?.morning_names ?? []
            const eveningNames = shift?.evening_names ?? []
            return (
              <li key={date} className="py-2 border-b border-soil-100 last:border-0">
                {dual ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-soil-600 shrink-0 pt-0.5 min-w-[7rem]">
                      {formatDate(date)}
                    </span>
                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-soil-400">🌅 朝</span>
                        <Names names={morningNames} />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-soil-400">🌙 夜</span>
                        <Names names={eveningNames} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-soil-600 shrink-0">{formatDate(date)}</span>
                    <Names names={morningNames} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── 水やり履歴 ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={16} className="text-soil-500" />
          <h2 className="font-bold text-soil-700">水やり履歴（過去2週間）</h2>
        </div>
        <ul className="space-y-0">
          {history.map(({ date, morning, evening }) => {
            const dual = isJulySept(date)
            return (
              <li key={date} className="py-2 border-b border-soil-100 last:border-0">
                {dual ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-soil-600 shrink-0 pt-0.5">{formatDate(date)}</span>
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
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-soil-600">{formatDate(date)}</span>
                    <StatusBadge watering={morning} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* 凡例 */}
        <div className="flex gap-3 mt-3 pt-3 border-t border-soil-100">
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

    </div>
  )
}
