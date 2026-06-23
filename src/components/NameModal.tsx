import { useState } from 'react'
import { saveName } from '../lib/utils'

interface Props {
  onSave: (name: string) => void
}

export function NameModal({ onSave }: Props) {
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    const name = input.trim()
    if (!name) return
    saveName(name)
    onSave(name)
  }

  return (
    <div className="fixed inset-0 bg-soil-700/70 flex items-center justify-center z-50 px-6">
      <div className="bg-cream rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-xl font-bold text-soil-700">草プロジェクト</h1>
          <p className="text-sm text-soil-500 mt-1">あなたの名前を教えてください</p>
        </div>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="例: たろう"
          className="w-full border border-soil-200 rounded-lg px-4 py-3 text-soil-700 bg-white focus:outline-none focus:ring-2 focus:ring-leaf-500 mb-4"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full bg-leaf-500 text-white font-bold py-3 rounded-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}
