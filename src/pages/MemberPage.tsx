import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  fetchReactions, addReaction, removeReaction,
  fetchReplies, insertReply, deleteReply,
} from '../lib/db'
import type { Watering, Shift, Post, Reaction, Reply } from '../types'

type Tab = 'whisper' | 'today' | 'history'

function daysAgo(baseStr: string, n: number): string {
  const [y, m, d] = baseStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - n)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// ?tab=w → whisper / ?tab=history → history / それ以外 → today
function searchParamToTab(p: string | null): Tab {
  if (p === 'w') return 'whisper'
  if (p === 'history') return 'history'
  return 'today'
}

export function MemberPage() {
  const [userName, setUserName] = useState<string | null>(getSavedName() || null)
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParamToTab(searchParams.get('tab'))

  const changeTab = (newTab: Tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev) // testdate など他のパラメータを保持
      if (newTab === 'today') {
        next.delete('tab')
      } else {
        next.set('tab', newTab === 'whisper' ? 'w' : 'history')
      }
      return next
    }, { replace: true }) // 履歴を汚さず上書き
  }
  const [waterings,  setWaterings]  = useState<Watering[]>([])
  const [shifts,     setShifts]     = useState<Shift[]>([])
  const [posts,      setPosts]      = useState<Post[]>([])
  const [reactions,  setReactions]  = useState<Reaction[]>([])
  const [replies,    setReplies]    = useState<Reply[]>([])
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
      const [w, s, p, r, rep] = await Promise.all([
        fetchWaterings(daysAgo(todayStr, 14), todayStr),
        fetchShifts(daysAgo(todayStr, 14), daysAgo(todayStr, -14)),
        fetchPosts(),
        fetchReactions(),
        fetchReplies(),
      ])
      setWaterings(w); setShifts(s)
      setPosts(p); setReactions(r); setReplies(rep)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
        fetchReactions().then(setReactions).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, () => {
        fetchReplies().then(setReplies).catch(console.error)
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

  const handleReply = async (post: Post, body: string) => {
    const tmpId = `tmp-${Date.now()}`
    const optimistic: Reply = { id: tmpId, post_id: post.id, body, by_name: userName!, created_at: new Date().toISOString() }
    setReplies(prev => [...prev, optimistic])
    try {
      const real = await insertReply(post.id, body, userName!)
      setReplies(prev => [...prev.filter(r => r.id !== tmpId), real])
    } catch {
      setReplies(prev => prev.filter(r => r.id !== tmpId))
    }
  }

  const handleDeleteReply = async (reply: Reply) => {
    setReplies(prev => prev.filter(r => r.id !== reply.id))
    await deleteReply(reply.id)
  }

  const handleReact = async (post: Post, emoji: string) => {
    const existing = reactions.find(r => r.post_id === post.id && r.emoji === emoji && r.by_name === userName)
    if (existing) {
      setReactions(prev => prev.filter(r => !(r.post_id === post.id && r.emoji === emoji && r.by_name === userName)))
      await removeReaction(post.id, emoji, userName!)
    } else {
      const tmpId = `tmp-${Date.now()}`
      const optimistic: Reaction = { id: tmpId, post_id: post.id, emoji, by_name: userName!, created_at: new Date().toISOString() }
      setReactions(prev => [...prev, optimistic])
      try {
        const real = await addReaction(post.id, emoji, userName!)
        setReactions(prev => [...prev.filter(r => r.id !== tmpId), real])
      } catch {
        setReactions(prev => prev.filter(r => r.id !== tmpId))
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
            reactions={reactions}
            replies={replies}
            onPost={handlePost}
            onDelete={handleDeletePost}
            onReact={handleReact}
            onReply={handleReply}
            onDeleteReply={handleDeleteReply}
            getImageUrl={getVegetableImageUrl}
          />
        )}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-soil-100 flex overflow-visible">

        {/* W タブ */}
        <button
          onClick={() => changeTab('whisper')}
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
            onClick={() => changeTab('today')}
            className="absolute -top-6 w-16 h-16 rounded-full bg-leaf-600 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          >
            <Droplets size={22} />
            <span className="text-xs font-bold">今日</span>
          </button>
          <div className="h-14" />
        </div>

        {/* 履歴タブ */}
        <button
          onClick={() => changeTab('history')}
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
