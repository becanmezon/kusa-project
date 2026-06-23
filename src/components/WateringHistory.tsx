import { CheckCircle, XCircle } from 'lucide-react'
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
            {watering ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-leaf-500" />
                <span className="text-sm text-leaf-700 font-medium">{watering.by_name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-terra-400" />
                <span className="text-sm text-terra-500">未対応</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
