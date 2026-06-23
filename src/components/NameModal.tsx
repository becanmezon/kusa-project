import { useState } from 'react'
import { saveName } from '../lib/utils'
import { MEMBERS } from '../lib/members'

interface Props {
  onSave: (name: string) => void
}

export function NameModal({ onSave }: Props) {
  const [selected, setSelected] = useState('')
  const [freeInput, setFreeInput] = useState('')

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value
    setSelected(name)
    if (name) {
      saveName(name)
      onSave(name)
    }
  }

  const handleFreeInput = () => {
    const name = freeInput.trim()
    if (!name) return
    saveName(name)
    onSave(name)
  }

  return (
    <div className="fixed inset-0 bg-soil-700/70 flex items-center justify-center z-50 px-4">
      <div className="bg-cream rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-xl font-bold text-soil-700">草プロジェクト</h1>
          <p className="text-sm text-soil-500 mt-1">あなたは誰ですか？</p>
        </div>

        {/* プルダウン選択 */}
        <select
          value={selected}
          onChange={handleSelect}
          className="w-full border border-soil-200 rounded-lg px-3 py-3 text-soil-700 bg-white focus:outline-none focus:ring-2 focus:ring-leaf-500 mb-4 text-base"
        >
          <option value="">── 名前を選ぶ ──</option>
          {MEMBERS.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* 区切り */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-soil-200" />
          <span className="text-xs text-soil-400">または自由入力</span>
          <div className="flex-1 h-px bg-soil-200" />
        </div>

        {/* 自由入力 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={freeInput}
            onChange={e => setFreeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFreeInput()}
            placeholder="名前を入力..."
            className="flex-1 border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-white focus:outline-none focus:ring-2 focus:ring-leaf-500"
          />
          <button
            onClick={handleFreeInput}
            disabled={!freeInput.trim()}
            className="bg-leaf-500 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-40 text-sm"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  )
}
