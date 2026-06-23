import { useState, useEffect } from 'react'
import { LogOut, Settings, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminLoginForm, useAdminAuth } from '../components/AdminAuth'
import { WeeklyShiftEditor } from '../components/WeeklyShiftEditor'
import { fetchShifts, upsertShift, deleteShift } from '../lib/db'
import type { Shift } from '../types'

export function AdminPage() {
  const { authed, login, logout } = useAdminAuth()
  const [shifts,  setShifts]  = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // 認証後にシフトデータを取得
  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetchShifts()
      .then(setShifts)
      .catch(e => { console.error(e); setError('シフトの取得に失敗しました') })
      .finally(() => setLoading(false))
  }, [authed])

  const handleSave = async (date: string, morning: string[], evening: string[]) => {
    const saved = await upsertShift(date, morning, evening)
    setShifts(prev => {
      const exists = prev.some(s => s.date === date)
      return exists
        ? prev.map(s => s.date === date ? saved : s)
        : [...prev, saved].sort((a, b) => a.date.localeCompare(b.date))
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このシフトを削除しますか？')) return
    await deleteShift(id)
    setShifts(prev => prev.filter(s => s.id !== id))
  }

  if (!authed) return <AdminLoginForm onLogin={login} />

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto">
      {/* ヘッダー */}
      <header className="bg-soil-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-soil-300" />
          <h1 className="font-bold text-base">管理画面</h1>
          <span className="text-soil-400 text-xs">草プロジェクト</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs text-soil-300 underline underline-offset-2">
            メンバー画面
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-soil-300 hover:text-white"
          >
            <LogOut size={14} />
            ログアウト
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-8 overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-bold text-soil-700 text-lg">シフト管理</h2>
          <p className="text-xs text-soil-400 mt-0.5">
            1コマ〜3コマごとに勤務メンバーを入力してください。<br />
            全員が担当候補としてメンバー画面に表示されます。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-soil-400">
            <Loader2 size={28} className="animate-spin text-leaf-400 mr-2" />
            <span className="text-sm">読み込み中...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-terra-500 text-sm mb-3">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetchShifts().then(setShifts).finally(() => setLoading(false)) }}
              className="bg-leaf-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              再読み込み
            </button>
          </div>
        ) : (
          <WeeklyShiftEditor
            shifts={shifts}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  )
}
