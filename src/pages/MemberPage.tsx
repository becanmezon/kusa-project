import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { LogoSprout, WateringCanIcon } from '../components/illust/Illust'
import { Droplets, History, Loader2, Feather, RefreshCw, Gamepad2 } from 'lucide-react'
import { NameModal } from '../components/NameModal'
import { TodayWatering } from '../components/TodayWatering'
import { WateringHistory } from '../components/WateringHistory'
import { PostTimeline } from '../components/PostTimeline'
import { LatestPosts } from '../components/LatestPosts'
import { PaperShell } from '../paper/PaperShell'
import { PaperToday } from '../paper/PaperToday'
import { PaperHistory } from '../paper/PaperHistory'
import { PaperLatestPost } from '../paper/PaperLatestPost'
import { getSavedName, today, tomorrow, isTestMode } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { requestShiftSync } from '../lib/shiftSync'
import { useIsDesktop } from '../lib/useMediaQuery'
import {
  fetchWaterings, upsertWatering, deleteWateringByDateSlot,
  fetchShifts,
  getVegetableImageUrl,
  buildWateringHistory,
  fetchPosts, insertPost, updatePostBody, deletePost, uploadPostImage,
  fetchReactions, addReaction, removeReaction,
  fetchReplies, insertReply, deleteReply,
} from '../lib/db'
import type { Watering, Shift, Post, Reaction, Reply } from '../types'

type Tab = 'whisper' | 'today' | 'history'

const HISTORY_INITIAL_PAST_DAYS = 14
const HISTORY_LOAD_CHUNK_DAYS   = 30
const HISTORY_MAX_PAST_DAYS     = 180 // 半年ほど遡れれば6月開始の記録も十分カバーできる

// 隠しコマンド: 履歴タブを2秒以内に5回連続タップすると展示モード(/display)へ
const DISPLAY_MODE_TAP_COUNT    = 5
const DISPLAY_MODE_TAP_WINDOW_MS = 2000

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

export function MemberPage({ variant }: { variant?: 'paper' } = {}) {
  const [userName, setUserName] = useState<string | null>(getSavedName() || null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

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

  // ── 隠しコマンド: 履歴タブ連打で展示モードへ ─────────────────
  const historyTapRef = useRef({ count: 0, lastTapAt: 0 })
  const handleHistoryTabTap = () => {
    changeTab('history')

    const now = Date.now()
    const tapState = historyTapRef.current
    tapState.count = (now - tapState.lastTapAt <= DISPLAY_MODE_TAP_WINDOW_MS) ? tapState.count + 1 : 1
    tapState.lastTapAt = now

    if (tapState.count >= DISPLAY_MODE_TAP_COUNT) {
      tapState.count = 0
      navigate('/display')
    }
  }

  // ── 隠しコマンド: Wタブ連打で管理画面へ ──────────────────────
  const whisperTapRef = useRef({ count: 0, lastTapAt: 0 })
  const handleWhisperTabTap = () => {
    changeTab('whisper')

    const now = Date.now()
    const tapState = whisperTapRef.current
    tapState.count = (now - tapState.lastTapAt <= DISPLAY_MODE_TAP_WINDOW_MS) ? tapState.count + 1 : 1
    tapState.lastTapAt = now

    if (tapState.count >= DISPLAY_MODE_TAP_COUNT) {
      tapState.count = 0
      navigate('/admin')
    }
  }
  // ── 隠しコマンド: 今日タブを5回連続で押すと、紙の当番表デザイン（/paper）と行き来する ──
  const todayTapRef = useRef({ count: 0, lastTapAt: 0 })
  const handleTodayTap = () => {
    changeTab('today')

    const now = Date.now()
    const tapState = todayTapRef.current
    tapState.count = (now - tapState.lastTapAt <= DISPLAY_MODE_TAP_WINDOW_MS) ? tapState.count + 1 : 1
    tapState.lastTapAt = now

    if (tapState.count >= DISPLAY_MODE_TAP_COUNT) {
      tapState.count = 0
      const keep = new URLSearchParams(searchParams)
      keep.delete('tab')
      const qs = keep.toString()
      navigate((variant === 'paper' ? '/' : '/paper') + (qs ? `?${qs}` : ''))
    }
  }

  const [waterings,  setWaterings]  = useState<Watering[]>([])
  const [shifts,     setShifts]     = useState<Shift[]>([])
  const [posts,      setPosts]      = useState<Post[]>([])
  const [reactions,  setReactions]  = useState<Reaction[]>([])
  const [replies,    setReplies]    = useState<Reply[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // ── 履歴タブ: 過去方向の読み込み範囲 ──────────────────────
  const [historyPastDays,   setHistoryPastDays]   = useState(HISTORY_INITIAL_PAST_DAYS)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const historyPastDaysRef = useRef(historyPastDays)
  useEffect(() => { historyPastDaysRef.current = historyPastDays }, [historyPastDays])

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
        fetchShifts(daysAgo(todayStr, 14), daysAgo(todayStr, -7)),
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

  // ── 更新ボタン: スプシのシフトを反映 → 画面のデータを取り直す ──
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)
  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true); setRefreshMsg(null)
    const sync = await requestShiftSync()
    try {
      const [w, s, p, r, rep] = await Promise.all([
        fetchWaterings(daysAgo(todayStr, historyPastDaysRef.current), todayStr),
        fetchShifts(daysAgo(todayStr, 14), daysAgo(todayStr, -7)),
        fetchPosts(),
        fetchReactions(),
        fetchReplies(),
      ])
      setWaterings(w); setShifts(s)
      setPosts(p); setReactions(r); setReplies(rep)
      setRefreshMsg(
        sync === 'synced'  ? 'スプシのシフトを取り込んで更新しました'
        : sync === 'skipped' ? '表示を更新しました（スプシ連携URLが未設定）'
        : 'スプシの取り込みに失敗しました（表示は更新済み）'
      )
    } catch (e) {
      console.error(e)
      setRefreshMsg('更新に失敗しました')
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(null), 5000)
    }
  }

  // ── 履歴タブ: さらに過去の記録を読み込む ─────────────────────
  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreHistory || historyPastDays >= HISTORY_MAX_PAST_DAYS) return
    const nextPastDays = Math.min(historyPastDays + HISTORY_LOAD_CHUNK_DAYS, HISTORY_MAX_PAST_DAYS)
    setLoadingMoreHistory(true)
    try {
      const more = await fetchWaterings(daysAgo(todayStr, nextPastDays), daysAgo(todayStr, historyPastDays + 1))
      setWaterings(prev => [...prev, ...more])
      setHistoryPastDays(nextPastDays)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMoreHistory(false)
    }
  }, [historyPastDays, loadingMoreHistory, todayStr])

  // ── Realtime 購読 ────────────────────────────────────────────
  useEffect(() => {
    if (!userName) return
    const ch = supabase
      .channel('kusa-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waterings' }, () => {
        fetchWaterings(daysAgo(todayStr, historyPastDaysRef.current), todayStr).then(setWaterings).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchShifts(daysAgo(todayStr, 14), daysAgo(todayStr, -7)).then(setShifts).catch(console.error)
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

  const handleRain = async (note: string, slot: 'morning' | 'evening') => {
    const saved = await upsertWatering(todayStr, userName!, note || null, 'rain', slot)
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

  const handleEditPost = async (post: Post, body: string) => {
    const saved = await updatePostBody(post.id, body)
    setPosts(prev => prev.map(p => (p.id === post.id ? saved : p)))
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

  const handleChangeName = () => {
    if (confirm(`名前を変更しますか？（現在: ${userName}）`)) {
      localStorage.removeItem('kusa_user_name')
      setUserName(null)
    }
  }

  // ── 名前未設定 ───────────────────────────────────────────────
  if (!userName) return <NameModal onSave={setUserName} />

  // ── ローディング ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col max-w-md lg:max-w-none mx-auto">
        <header className="bg-sky border-b-2 border-ink px-4 py-2.5 flex items-center gap-2">
          <LogoSprout size={34} />
          <h1 className="font-black text-lg">草プロジェクト</h1>
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
      <div className="min-h-screen bg-cream flex flex-col max-w-md lg:max-w-none mx-auto">
        <header className="bg-sky border-b-2 border-ink px-4 py-2.5 flex items-center gap-2">
          <LogoSprout size={34} />
          <h1 className="font-black text-lg">草プロジェクト</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-terra-500 font-medium mb-3">{error}</p>
            <button onClick={loadAll} className="hand-btn bg-grass px-6 py-2 font-black">
              再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 紙の当番表デザイン ─────────────────────────────────────
  if (variant === 'paper') {
    const historyProps = {
      history: buildWateringHistory(waterings, historyPastDays + 1),
      shifts,
      pastDays: historyPastDays,
      hasMore: historyPastDays < HISTORY_MAX_PAST_DAYS,
      loadingMore: loadingMoreHistory,
      onLoadMore: loadMoreHistory,
    }
    return (
      <PaperShell
        tab={tab}
        userName={userName}
        isDesktop={isDesktop}
        refreshing={refreshing}
        refreshMsg={refreshMsg}
        testDate={todayStr}
        onTodayTap={handleTodayTap}
        onHistoryTap={handleHistoryTabTap}
        onWhisperTap={handleWhisperTabTap}
        onRefresh={handleRefresh}
        onChangeName={handleChangeName}
        today={
          <PaperToday
            userName={userName}
            todayMorningWatering={todayMorningWatering}
            todayEveningWatering={todayEveningWatering}
            todayShift={todayShift}
            tomorrowShift={tomorrowShift}
            onWater={handleWater}
            onRain={handleRain}
            onUndo={handleUndo}
          />
        }
        todayBelow={isDesktop ? (
          <PaperLatestPost posts={posts} reactions={reactions} replies={replies} onOpenAll={() => changeTab('whisper')} />
        ) : null}
        todaySide={isDesktop ? <PaperHistory {...historyProps} fill /> : null}
        history={<PaperHistory {...historyProps} summaryHref="/paper/summary" />}
        whisper={
          <PostTimeline
            userName={userName}
            posts={posts}
            reactions={reactions}
            replies={replies}
            onPost={handlePost}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onReact={handleReact}
            onReply={handleReply}
            onDeleteReply={handleDeleteReply}
            getImageUrl={getVegetableImageUrl}
          />
        }
      />
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md lg:max-w-none mx-auto">
      {/* テストモードバナー */}
      {isTestMode() && (
        <div className="bg-yellow-300 text-yellow-900 text-xs font-bold px-4 py-2 text-center">
          テストモード：{todayStr} として表示中（URLから ?testdate= を消すと元に戻ります）
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-sky border-b-2 border-ink px-4 lg:px-8 py-2.5 lg:py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={() => { changeTab('today'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="flex items-center gap-2 rounded-full -ml-1 pl-1 pr-3 py-0.5 hover:bg-white/50"
          aria-label="今日の水やりに戻る"
        >
          <LogoSprout size={34} className="lg:w-11 lg:h-11" />
          <h1 className="font-black text-lg lg:text-2xl">草プロジェクト</h1>
        </button>
        {/* PC用タブ（スマホでは下のタブを使う） */}
        <nav className="hidden lg:flex items-center gap-2.5">
          {([
            { key: 'whisper', label: 'W',    icon: <Feather size={19} />,  onClick: handleWhisperTabTap },
            { key: 'today',   label: '今日', icon: <Droplets size={19} />, onClick: handleTodayTap },
            { key: 'history', label: '履歴', icon: <History size={19} />,  onClick: handleHistoryTabTap },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={t.onClick}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`flex items-center gap-2 min-h-11 px-5 rounded-full text-lg font-bold border-2 transition-colors ${
                tab === t.key ? 'bg-white border-ink' : 'border-transparent hover:bg-white/50'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
        <Link
          to="/catch"
          className="hidden lg:flex items-center gap-2 min-h-10 text-base font-bold bg-sun border-2 border-ink rounded-full px-4 hover:brightness-95"
        >
          <Gamepad2 size={18} />野菜キャッチ
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="最新の状態に更新"
          className="disabled:opacity-60 p-2 -m-1 lg:p-2.5 lg:m-0 rounded-full hover:bg-white/50"
        >
          <RefreshCw size={20} className={`lg:w-[22px] lg:h-[22px] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleChangeName}
          className="text-sm lg:text-base font-bold bg-white border-2 border-ink rounded-full px-3 py-0.5 lg:min-h-10 lg:px-4"
          aria-label={`記録する人：${userName}（タップで変更）`}
          title="記録する人（押すと変更できます）"
        >
          {userName}
        </button>
        </div>
      </header>
      {refreshMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-white border-2 border-ink text-sm font-bold px-4 py-2 rounded-full">
          {refreshMsg}
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-4 pb-24 lg:px-[12vw] lg:py-6 lg:pb-8 overflow-y-auto">
        {tab === 'today' && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <div>
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
          {/* PCでは左列の下にWの最新投稿を表示 */}
          {isDesktop && (
            <div className="mt-4">
              <LatestPosts
                posts={posts}
                reactions={reactions}
                replies={replies}
                getImageUrl={getVegetableImageUrl}
                onOpenAll={() => changeTab('whisper')}
              />
            </div>
          )}
          </div>
          {/* PCでは今日の画面の右に履歴を並べて表示 */}
          {isDesktop && (
            <div className="h-[calc(100vh-7rem)]">
              <WateringHistory
                fill
                history={buildWateringHistory(waterings, historyPastDays + 1)}
                shifts={shifts}
                pastDays={historyPastDays}
                hasMore={historyPastDays < HISTORY_MAX_PAST_DAYS}
                loadingMore={loadingMoreHistory}
                onLoadMore={loadMoreHistory}
              />
            </div>
          )}
          </div>
        )}
        {tab === 'history' && (
          <div className="lg:max-w-3xl lg:mx-auto">
          <Link
            to="/summary"
            className="soft-card mb-4 flex items-center justify-between px-4 lg:px-6 py-3 hover:bg-sky/40"
          >
            <span className="flex items-center gap-2 font-black whitespace-nowrap">
              月のまとめを見る
            </span>
            <span className="text-sm text-soil-400 truncate ml-3"><span className="hidden sm:inline">達成率・ランキング・人気の投稿 </span>›</span>
          </Link>
          <WateringHistory
            history={buildWateringHistory(waterings, historyPastDays + 1)}
            shifts={shifts}
            pastDays={historyPastDays}
            hasMore={historyPastDays < HISTORY_MAX_PAST_DAYS}
            loadingMore={loadingMoreHistory}
            onLoadMore={loadMoreHistory}
          />
          </div>
        )}
        {tab === 'whisper' && (
          <div className="lg:max-w-2xl lg:mx-auto">
          <PostTimeline
            userName={userName}
            posts={posts}
            reactions={reactions}
            replies={replies}
            onPost={handlePost}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onReact={handleReact}
            onReply={handleReply}
            onDeleteReply={handleDeleteReply}
            getImageUrl={getVegetableImageUrl}
          />
          </div>
        )}
      </main>

      {/* ボトムナビ */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t-2 border-ink flex overflow-visible z-40 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >

        {/* W タブ（2秒以内に5回連続タップで管理画面へ） */}
        <button
          onClick={handleWhisperTabTap}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-bold transition-colors ${
            tab === 'whisper' ? 'text-ink' : 'text-soil-400'
          }`}
        >
          <Feather size={22} strokeWidth={tab === 'whisper' ? 2.6 : 2} />
          W
        </button>

        {/* 今日タブ（中央・円形・飛び出し） */}
        <div className="flex-1 flex justify-center relative">
          <button
            onClick={handleTodayTap}
            className={`absolute -top-7 w-[4.5rem] h-[4.5rem] rounded-full border-2 border-ink flex flex-col items-center justify-center active:scale-95 transition-transform ${
              tab === 'today' ? 'bg-grass' : 'bg-white'
            }`}
            aria-label="今日の水やり"
          >
            <WateringCanIcon size={30} />
            <span className="text-xs font-black">今日</span>
          </button>
          <div className="h-14" />
        </div>

        {/* 履歴タブ（2秒以内に5回連続タップで展示モードへ） */}
        <button
          onClick={handleHistoryTabTap}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-bold transition-colors ${
            tab === 'history' ? 'text-ink' : 'text-soil-400'
          }`}
        >
          <History size={22} strokeWidth={tab === 'history' ? 2.6 : 2} />
          履歴
        </button>

      </nav>
    </div>
  )
}
