import { useState } from 'react'
import { Plus, Trash2, Calendar } from 'lucide-react'
import type { Shift } from '../types'
import { today, formatDate } from '../lib/utils'

interface Props {
  shifts: Shift[]
  onSave: (date: string, names: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ShiftManager({ shifts, onSave, onDelete }: Props) {
  const [date, setDate] = useState(today())
  const [nameInput, setNameInput] = useState('')
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addName = () => {
    const n = nameInput.trim()
    if (n && !names.includes(n)) setNames(prev => [...prev, n])
    setNameInput('')
  }

  const removeName = (n: string) => setNames(prev => prev.filter(x => x !== n))

  const handleSave = async () => {
    if (!date || names.length === 0) return
    setLoading(true)
    try {
      await onSave(date, names)
      setNames([])
    } finally {
      setLoading(false)
    }
  }

  const upcomingShifts = shifts
    .filter(s => s.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div className="space-y-4">
      {/* 登録フォーム */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
        <h2 className="font-bold text-soil-700 flex items-center gap-2">
          <Calendar size={18} className="text-leaf-500" />
          シフト登録
        </h2>

        <div>
          <label className="text-xs text-soil-400 mb-1 block">日付</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400"
          />
        </div>

        <div>
          <label className="text-xs text-soil-400 mb-1 block">勤務するメンバー</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addName()}
              placeholder="名前を入力してEnter"
              className="flex-1 border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400"
            />
            <button
              onClick={addName}
              className="bg-leaf-100 text-leaf-700 px-3 py-2 rounded-lg font-bold text-sm"
            >
              <Plus size={16} />
            </button>
          </div>
          {names.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {names.map(n => (
                <span
                  key={n}
                  className="bg-leaf-100 text-leaf-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {n}
                  <button onClick={() => removeName(n)} className="text-leaf-400 hover:text-leaf-700">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !date || names.length === 0}
          className="w-full bg-leaf-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-40"
        >
          {loading ? '保存中...' : 'シフトを登録'}
        </button>
      </div>

      {/* 登録済みシフト一覧 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">
        <h2 className="font-bold text-soil-700 mb-3">これからのシフト</h2>
        {upcomingShifts.length === 0 ? (
          <p className="text-sm text-soil-400 text-center py-4">シフトが登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {upcomingShifts.map(shift => (
              <li
                key={shift.id}
                className="flex items-center justify-between py-2 border-b border-soil-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-soil-700">{formatDate(shift.date)}</p>
                  <p className="text-xs text-soil-400">{shift.names.join('・')}</p>
                </div>
                <button
                  onClick={() => onDelete(shift.id)}
                  className="text-soil-300 hover:text-terra-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
