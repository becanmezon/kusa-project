import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

const SESSION_KEY = 'kusa_admin_authed'

export function useAdminAuth() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')

  const login = (input: string): boolean => {
    const correct = import.meta.env.VITE_ADMIN_PASSWORD
    if (!correct) {
      // 環境変数未設定時はとりあえず通す（開発用フォールバック）
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
      return true
    }
    if (input === correct) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
  }

  return { authed, login, logout }
}

interface Props {
  onLogin: (password: string) => boolean
}

export function AdminLoginForm({ onLogin }: Props) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = () => {
    const ok = onLogin(pw)
    if (!ok) {
      setError(true)
      setPw('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-soil-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-soil-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-soil-700">管理者ログイン</h1>
          <p className="text-sm text-soil-400 mt-1">草プロジェクト 管理画面</p>
        </div>

        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="合言葉を入力"
            className={`w-full border rounded-lg px-4 py-3 pr-10 text-soil-700 bg-cream focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-terra-400 ring-terra-400 bg-terra-50'
                : 'border-soil-200 focus:ring-leaf-400'
            }`}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-soil-400"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p className="text-sm text-terra-500 text-center mb-3">合言葉が違います</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!pw}
          className="w-full bg-soil-700 text-white font-bold py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
        >
          ログイン
        </button>

        <p className="text-xs text-soil-400 text-center mt-4">
          <a href="/" className="underline underline-offset-2">← メンバー画面に戻る</a>
        </p>
      </div>
    </div>
  )
}
