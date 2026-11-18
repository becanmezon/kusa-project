// 旧デザイン（2026-11-17 まで使っていた見た目）の外枠：ヘッダー・ナビ・タブ
// データと操作は MemberPage から受け取り、見た目だけをここで組む
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, History, Feather, RefreshCw, Gamepad2, BarChart3 } from 'lucide-react'
import { isTestMode } from '../lib/utils'

export type ClassicTab = 'whisper' | 'today' | 'history'

interface Props {
  tab: ClassicTab
  userName: string
  isDesktop: boolean
  refreshing: boolean
  refreshMsg: string | null
  testDate: string
  onTodayTap: () => void
  onHistoryTap: () => void
  onWhisperTap: () => void
  onRefresh: () => void
  onChangeName: () => void
  today: ReactNode
  /** PCで今日の下に出す、Wの最新投稿 */
  todayBelow: ReactNode
  /** 履歴（PCでは今日の右にも並べる） */
  history: ReactNode
  whisper: ReactNode
}

export function ClassicShell(p: Props) {
  return (
    <div className="classic min-h-screen bg-cream flex flex-col max-w-md lg:max-w-none mx-auto">
      {isTestMode() && (
        <div className="bg-yellow-300 text-yellow-900 text-xs font-bold px-4 py-2 text-center">
          🧪 テストモード: {p.testDate} として表示中 ／ URLから ?testdate= を削除すると解除
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-soil-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="font-bold text-base">草プロジェクト</h1>
        </div>
        {/* PC用タブ（スマホでは下のタブを使う） */}
        <nav className="hidden lg:flex items-center gap-1">
          {([
            { key: 'whisper', label: 'W',    icon: <Feather size={16} />,  onClick: p.onWhisperTap },
            { key: 'today',   label: '今日', icon: <Droplets size={16} />, onClick: p.onTodayTap },
            { key: 'history', label: '履歴', icon: <History size={16} />,  onClick: p.onHistoryTap },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={t.onClick}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                p.tab === t.key ? 'bg-leaf-600 text-white' : 'text-soil-200 hover:bg-soil-600'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/catch"
            className="hidden lg:flex items-center gap-1.5 text-sm text-soil-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1"
          >
            <Gamepad2 size={16} />野菜キャッチ
          </Link>
          <button
            onClick={p.onRefresh}
            disabled={p.refreshing}
            aria-label="最新の状態に更新"
            className="text-soil-200 disabled:opacity-60 p-1 -m-1"
          >
            <RefreshCw size={18} className={p.refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={p.onChangeName} className="text-xs text-soil-300 underline underline-offset-2">
            {p.userName}
          </button>
        </div>
      </header>
      {p.refreshMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-soil-700 text-white text-xs px-4 py-2 rounded-full shadow">
          {p.refreshMsg}
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-4 pb-24 lg:px-[12vw] lg:py-6 lg:pb-8 overflow-y-auto">
        {p.tab === 'today' && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
            <div>
              {p.today}
              {p.isDesktop && <div className="mt-4">{p.todayBelow}</div>}
            </div>
            {p.isDesktop && (
              <div className="h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl">{p.history}</div>
            )}
          </div>
        )}
        {p.tab === 'history' && (
          <div className="lg:max-w-3xl lg:mx-auto">
            <Link
              to="/summary"
              className="mb-3 flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 hover:bg-leaf-50"
            >
              <span className="flex items-center gap-2 font-bold text-soil-800 whitespace-nowrap">
                <BarChart3 size={18} className="text-leaf-600" />月のまとめを見る
              </span>
              <span className="text-sm text-soil-400 truncate ml-3"><span className="hidden sm:inline">達成率・人気の投稿 </span>›</span>
            </Link>
            {p.history}
          </div>
        )}
        {p.tab === 'whisper' && <div className="lg:max-w-2xl lg:mx-auto">{p.whisper}</div>}
      </main>

      {/* ボトムナビ */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-soil-100 flex overflow-visible z-40 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          onClick={p.onWhisperTap}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors ${
            p.tab === 'whisper' ? 'text-leaf-600' : 'text-soil-400'
          }`}
        >
          <Feather size={20} />
          W
        </button>

        {/* 今日タブ（中央・円形・飛び出し） */}
        <div className="flex-1 flex justify-center relative">
          <button
            onClick={p.onTodayTap}
            className="absolute -top-6 w-16 h-16 rounded-full bg-leaf-600 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          >
            <Droplets size={22} />
            <span className="text-xs font-bold">今日</span>
          </button>
          <div className="h-14" />
        </div>

        <button
          onClick={p.onHistoryTap}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors ${
            p.tab === 'history' ? 'text-leaf-600' : 'text-soil-400'
          }`}
        >
          <History size={20} />
          履歴
        </button>
      </nav>
    </div>
  )
}
