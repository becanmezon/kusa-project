import { useState } from 'react'
import { saveName } from '../lib/utils'
import { MEMBERS } from '../lib/members'

interface Props {
  onSave: (name: string) => void
}

export function NameModal({ onSave }: Props) {
  const [input, setInput] = useState('')

  const handleSelect = (name: string) => {
    saveName(name)
    onSave(name)
  }

  const handleFreeInput = () => {
    const name = input.trim()
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

        {/* メンバー候補チップ */}
        <div className="flex flex-wrap gap-2 mb-4">
          {MEMBERS.map(name => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="px-3 py-1.5 rounded-full bg-white border border-soil-200 text-sm text-soil-700 font-medium active:scale-95 transition-transform hover:border-leaf-400 hover:text-leaf-600"
            >
              {name}
            </button>
          ))}
        </div>

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
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFreeInput()}
            placeholder="名前を入力..."
            className="flex-1 border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-white focus:outline-none focus:ring-2 focus:ring-leaf-500"
          />
          <button
            onClick={handleFreeInput}
            disabled={!input.trim()}
            className="bg-leaf-500 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-40 text-sm"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  )
}
