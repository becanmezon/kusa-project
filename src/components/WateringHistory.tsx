import { CheckCircle, XCircle, CloudRain } from 'lucide-react'
import { formatDate } from '../lib/utils'
import type { Watering } from '../types'

interface HistoryEntry {
  date: string
  watering: Watering | null
}

interface Props {
  history: HistoryEntry[]
}

export function WateringHistory({ history }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
      <h2 className="font-bold text-soil-700 mb-3">水やり履歴（直近2週間）</h2>
      <ul className="space-y-1">
        {history.map(({ date, watering }) => (
          <li
            key={date}
            className="flex items-center justify-between py-2 border-b border-soil-100 last:border-0"
          >
            <span className="text-sm text-soil-600">{formatDate(date)}</span>

            {watering?.status === 'watered' && (
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-leaf-500" />
                <span className="text-sm text-leaf-700 font-medium">{watering.by_name}</span>
                <span className="text-xs text-leaf-400 bg-leaf-50 px-1.5 py-0.5 rounded-full">済</span>
              </div>
            )}

            {watering?.status === 'rain' && (
              <div className="flex items-center gap-1.5">
                <CloudRain size={15} className="text-blue-400" />
                <span className="text-sm text-blue-600 font-medium">{watering.by_name}</span>
                <span className="text-xs text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full">雨</span>
              </div>
            )}

            {!watering && (
              <div className="flex items-center gap-1.5">
                <XCircle size={15} className="text-terra-400" />
                <span className="text-sm text-terra-500">未対応</span>
              </div>
            )}
          </li>
        ))}
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
  )
}
