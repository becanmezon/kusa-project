import { useState, useEffect, useCallback } from 'react'
import { Droplets, History, Loader2, Feather } from 'lucide-react'
import { NameModal } from '../components/NameModal'
import { TodayWatering } from '../components/TodayWatering'
import { WateringHistory } from '../components/WateringHistory'
import { PostTimeline } from '../components/PostTimeline'
import { getSavedName, today, tomorrow, isTestMode } from '../lib/utils'
import { supabase } from '../lib/supabase'
import {
  fetchWaterings, upsertWatering, deleteWateringByDateSlot,
  fetchShifts,
  getVegetableImageUrl,
  buildWateringHistory,
  fetchPosts, insertPost, deletePost, uploadPostImage,
  fetchLikes, addLike, removeLike,
} from '../lib/db'
import type { Watering, Shift, Post, Like } from '../types'

type Tab = 'whisper' | 'today' | 'history'

function daysAgo(baseStr: string, n: number): string {
  const [y, m, d] = baseStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - n)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export function MemberPage() {
  const [userName, setUserName] = useState<string | null>(getSavedName() || null)
  const [tab,      setTab]      = useState<Tab>('today')
  const [waterings,  setWaterings]  = useState<Watering[]>([])
  const [shifts,     setShifts]     = useState<Shift[]>([])
  const [posts,      setPosts]      = useState<Post[]>([])
  const [likes,      setLikes]      = useState<Like[]>([])
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
      const [w, s, p, l] = await Promise.all([
        fetchWaterings(daysAgo(todayStr, 14), todayStr),
        fetchShifts(daysAgo(todayStr, 14), daysAgo(todayStr, -14)),
        fetchPosts(),
        fetchLikes(),
      ])
      setWaterings(w); setShifts(s)
      setPosts(p); setLikes(l)
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
        fetchWaterings(daysAgo(todayStr, 14), todayStr).then(setWaterings).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts().then(setPosts).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchLikes().then(setLikes).catch(console.error)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userName, todayStr])

  // ── 水やりハンドラ ──────────────────────────────────────────
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

  // ── W（つぶやき）ハンドラ ───────────────────────────────────
  const handlePost = async (body: string, imageFiles: File[]) => {
    const image_paths = await Promise.all(imageFiles.map(f => uploadPostImage(f)))
    const post = await insertPost(body, userName!, image_paths)
    setPosts(prev => [post, ...prev])
  }

  const handleDeletePost = async (post: Post) => {
    await deletePost(post.id, post.image_paths)
    setPosts(prev => prev.filter(p => p.id !== post.id))
  }

  const handleLike = async (post: Post) => {
    const existing = likes.find(l => l.post_id === post.id && l.by_name === userName)
    if (existing) {
      setLikes(prev => prev.filter(l => !(l.post_id === post.id && l.by_name === userName)))
      await removeLike(post.id, userName!)
    } else {
      const optimistic: Like = { id: 'tmp', post_id: post.id, by_name: userName!, created_at: new Date().toISOString() }
      setLikes(prev => [...prev, optimistic])
      try {
        const real = await addLike(post.id, userName!)
        setLikes(prev => [...prev.filter(l => l.id !== 'tmp'), real])
      } catch {
        setLikes(prev => prev.filter(l => l.id !== 'tmp'))
      }
    }
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
        {tab === 'history' && (
          <WateringHistory history={buildWateringHistory(waterings)} shifts={shifts} />
        )}
        {tab === 'whisper' && (
          <PostTimeline
            userName={userName}
            posts={posts}
            likes={likes}
            onPost={handlePost}
            onDelete={handleDeletePost}
            onLike={handleLike}
            getImageUrl={getVegetableImageUrl}
          />
        )}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-soil-100 flex overflow-visible">

        {/* W タブ */}
        <button
          onClick={() => setTab('whisper')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors ${
            tab === 'whisper' ? 'text-leaf-600' : 'text-soil-400'
          }`}
        >
          <Feather size={20} />
          W
        </button>

        {/* 今日タブ（中央・円形・飛び出し） */}
        <div className="flex-1 flex justify-center relative">
          <button
            onClick={() => setTab('today')}
            className="absolute -top-6 w-16 h-16 rounded-full bg-leaf-600 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          >
            <Droplets size={22} />
            <span className="text-xs font-bold">今日</span>
          </button>
          <div className="h-14" />
        </div>

        {/* 履歴タブ */}
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors ${
            tab === 'history' ? 'text-leaf-600' : 'text-soil-400'
          }`}
        >
          <History size={20} />
          履歴
        </button>

      </nav>
    </div>
  )
}
