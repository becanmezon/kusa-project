import { useState } from 'react'
import { saveName } from '../lib/utils'
import { MEMBERS } from '../lib/members'
import { GardenScene } from './illust/Illust'

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
    <div className="fixed inset-0 bg-sky flex items-center justify-center z-50 px-4">
      <div className="hand-card overflow-hidden w-full max-w-sm">
        <div className="border-b-2 border-ink">
          <GardenScene state="done" />
        </div>
        <div className="p-5">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-black">草プロジェクト</h1>
          <p className="text-base text-soil-500 mt-1">はじめに、あなたの名前を選んでください</p>
        </div>

        {/* プルダウン選択 */}
        <select
          value={selected}
          onChange={handleSelect}
          aria-label="名前を選ぶ"
          className="w-full border-2 border-ink rounded-xl px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-sky-dark mb-4 text-base font-bold"
        >
          <option value="">── 名前を選ぶ ──</option>
          {MEMBERS.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* 区切り */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-0.5 bg-ink/15" />
          <span className="text-xs text-soil-500">リストにない人はこちら</span>
          <div className="flex-1 h-0.5 bg-ink/15" />
        </div>

        {/* 自由入力 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={freeInput}
            onChange={e => setFreeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFreeInput()}
            placeholder="名前を入力..."
            aria-label="名前を入力"
            className="flex-1 min-w-0 border-2 border-ink/30 rounded-xl px-3 py-2 text-base bg-white focus:outline-none focus:border-ink"
          />
          <button
            onClick={handleFreeInput}
            disabled={!freeInput.trim()}
            className="hand-btn bg-grass font-black px-4 py-2 disabled:opacity-40"
          >
            決定
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
