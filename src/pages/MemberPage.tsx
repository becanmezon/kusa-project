import { useState, useEffect, useCallback } from 'react'
import { Droplets, ImageIcon, History, Loader2 } from 'lucide-react'
import { NameModal } from '../components/NameModal'
import { TodayWatering } from '../components/TodayWatering'
import { VegetableGallery } from '../components/VegetableGallery'
import { WateringHistory } from '../components/WateringHistory'
import { getSavedName, today, tomorrow, isTestMode } from '../lib/utils'
import { supabase } from '../lib/supabase'
import {
  fetchWaterings, upsertWatering, deleteWateringByDateSlot,
  fetchShifts,
  fetchVegetables, insertVegetable, deleteVegetable,
  uploadVegetableImage, getVegetableImageUrl,
  buildWateringHistory,
} from '../lib/db'
import type { Watering, Shift, Vegetable } from '../types'

type Tab = 'today' | 'gallery' | 'history'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'today',   label: '今日',   icon: <Droplets size={20} /> },
  { id: 'gallery', label: '写真',   icon: <ImageIcon size={20} /> },
  { id: 'history', label: '履歴',   icon: <History size={20} /> },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function MemberPage() {
  const [userName,   setUserName]   = useState<string | null>(getSavedName() || null)
  const [tab,        setTab]        = useState<Tab>('today')
  const [waterings,  setWaterings]  = useState<Watering[]>([])
  const [shifts,     setShifts]     = useState<Shift[]>([])
  const [vegetables, setVegetables] = useState<Vegetable[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const todayStr    = today()
  const tomorrowStr = tomorrow()
  const todayMorningWatering = waterings.find(w => w.date === todayStr && w.slot === 'morning') ?? null
  const todayEveningWatering = waterings.find(w => w.date === todayStr && w.slot === 'evening') ?? null
  const todayShift    = shifts.find(s => s.date === todayStr) ?? null
  const tomorrowShift = shifts.find(s => s.date === tomorrowStr) ?? null

  // ── 初回データ取得 ──────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [w, s, v] = await Promise.all([
        fetchWaterings(daysAgo(14), todayStr),
        fetchShifts(daysAgo(1), daysAgo(-7)),
        fetchVegetables(),
      ])
      setWaterings(w); setShifts(s); setVegetables(v)
    } catch (e) {
      console.error(e)
      setError('データの取得に失敗しました。再読み込みしてください。')
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => { if (userName) loadAll() }, [userName, loadAll])

  // ── Realtime 購読 ────────────────────────────────────────────
  useEffect(() => {
    if (!userName) return
    const ch = supabase
      .channel('kusa-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waterings' }, () => {
        fetchWaterings(daysAgo(14), todayStr).then(setWaterings).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vegetables' }, () => {
        fetchVegetables().then(setVegetables).catch(console.error)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userName, todayStr])

  // ── ハンドラ ────────────────────────────────────────────────
  const handleWater = async (note: string, slot: 'morning' | 'evening') => {
    const saved = await upsertWatering(todayStr, userName!, note || null, 'watered', slot)
    setWaterings(prev => [...prev.filter(w => !(w.date === todayStr && w.slot === slot)), saved])
  }

  const handleRain = async (slot: 'morning' | 'evening') => {
    const saved = await upsertWatering(todayStr, userName!, null, 'rain', slot)
    setWaterings(prev => [...prev.filter(w => !(w.date === todayStr && w.slot === slot)), saved])
  }

  const handleUndo = async (slot: 'morning' | 'evening') => {
    await deleteWateringByDateSlot(todayStr, slot)
    setWaterings(prev => prev.filter(w => !(w.date === todayStr && w.slot === slot)))
  }

  const handleVegUpload = async (file: File, name: string, note: string) => {
    const imagePath = await uploadVegetableImage(file)
    const veg = await insertVegetable(name, userName!, note || null, imagePath, todayStr)
    setVegetables(prev => [veg, ...prev])
  }

  const handleVegDelete = async (veg: Vegetable) => {
    await deleteVegetable(veg.id, veg.image_path)
    setVegetables(prev => prev.filter(v => v.id !== veg.id))
  }

  // ── 名前未設定 ───────────────────────────────────────────────
  if (!userName) return <NameModal onSave={setUserName} />

  // ── ローディング ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto">
        <header className="bg-soil-700 text-white px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="font-bold text-base">草プロジェクト</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-soil-400">
            <Loader2 size={36} className="mx-auto mb-2 animate-spin text-leaf-400" />
            <p className="text-sm">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── エラー ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto">
        <header className="bg-soil-700 text-white px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="font-bold text-base">草プロジェクト</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-terra-500 font-medium mb-3">{error}</p>
            <button onClick={loadAll} className="bg-leaf-500 text-white px-6 py-2 rounded-xl font-bold">
              再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto">
      {/* テストモードバナー */}
      {isTestMode() && (
        <div className="bg-yellow-300 text-yellow-900 text-xs font-bold px-4 py-2 text-center">
          🧪 テストモード: {todayStr} として表示中 ／ URLから ?testdate= を削除すると解除
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-soil-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="font-bold text-base">草プロジェクト</h1>
        </div>
        <button
          onClick={() => {
            if (confirm(`名前を変更しますか？（現在: ${userName}）`)) {
              localStorage.removeItem('kusa_user_name')
              setUserName(null)
            }
          }}
          className="text-xs text-soil-300 underline underline-offset-2"
        >
          {userName}
        </button>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {tab === 'today' && (
          <TodayWatering
            userName={userName}
            todayMorningWatering={todayMorningWatering}
            todayEveningWatering={todayEveningWatering}
            todayShift={todayShift}
            tomorrowShift={tomorrowShift}
            onWater={handleWater}
            onRain={handleRain}
            onUndo={handleUndo}
          />
        )}
        {tab === 'gallery' && (
          <VegetableGallery
            userName={userName}
            vegetables={vegetables}
            getImageUrl={getVegetableImageUrl}
            onUpload={handleVegUpload}
            onDelete={handleVegDelete}
          />
        )}
        {tab === 'history' && (
          <WateringHistory history={buildWateringHistory(waterings)} />
        )}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-soil-100 flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              tab === t.id ? 'text-leaf-600' : 'text-soil-400'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
