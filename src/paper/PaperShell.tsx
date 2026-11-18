// 紙の当番表・栽培日誌バージョンの外枠（ヘッダー・ナビ・タブ）
// データと操作は MemberPage から受け取り、見た目だけをここで組む
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isTestMode } from '../lib/utils'

export type PaperTab = 'whisper' | 'today' | 'history'

interface Props {
  tab: PaperTab
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
  /** 今日タブの中身（PCでは右に履歴を並べる） */
  today: ReactNode
  todaySide: ReactNode
  todayBelow: ReactNode
  history: ReactNode
  whisper: ReactNode
}

const TABS: { key: PaperTab; label: string }[] = [
  { key: 'whisper', label: 'W' },
  { key: 'today', label: '今日' },
  { key: 'history', label: '履歴' },
]

export function PaperShell(p: Props) {
  const tapFor = (key: PaperTab) => (key === 'today' ? p.onTodayTap : key === 'history' ? p.onHistoryTap : p.onWhisperTap)

  return (
    <div className="paper min-h-screen flex flex-col">
      {isTestMode() && (
        <div className="text-xs font-bold px-4 py-2 text-center border-b p-rule">
          テストモード：{p.testDate} として表示中（URLから ?testdate= を消すと元に戻ります）
        </div>
      )}

      {/* ヘッダー：帯色なし。題字と二重罫だけ */}
      <header className="sticky top-0 z-30 bg-[var(--p-paper)] px-4 lg:px-[8vw]">
        <div className="flex items-end justify-between gap-4 pt-3 lg:pt-5 pb-2">
          <button type="button" onClick={p.onTodayTap} className="text-left" aria-label="今日の水やりに戻る">
            <span className="p-head text-xl lg:text-3xl">草プロジェクト</span>
          </button>

          <nav className="hidden lg:flex items-end gap-8 text-lg" aria-label="画面の切り替え">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={tapFor(t.key)}
                aria-current={p.tab === t.key ? 'page' : undefined}
                className={`pb-1 border-b-2 ${p.tab === t.key ? 'font-bold border-[var(--p-ink)]' : 'p-sub border-transparent hover:border-[var(--p-rule)]'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-end gap-4 lg:gap-6 text-sm lg:text-base">
            <Link to="/catch" className="hidden lg:inline p-sub underline underline-offset-4">野菜キャッチ</Link>
            <button onClick={p.onRefresh} disabled={p.refreshing} className="p-sub underline underline-offset-4 disabled:opacity-50">
              {p.refreshing ? '更新中…' : '更新'}
            </button>
            <button onClick={p.onChangeName} className="font-bold underline underline-offset-4" title="記録する人（押すと変更できます）">
              {p.userName}
            </button>
          </div>
        </div>
        {/* 二重罫 */}
        <div className="border-t-2 border-[var(--p-ink)]" />
        <div className="border-t border-[var(--p-ink)] mt-[3px]" />
      </header>

      {p.refreshMsg && (
        <p className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[var(--p-paper)] border border-[var(--p-ink)] rounded-[3px] text-sm font-bold px-4 py-2">
          {p.refreshMsg}
        </p>
      )}

      <main className="flex-1 px-4 lg:px-[8vw] pt-6 lg:pt-10 pb-24 lg:pb-12">
        {p.tab === 'today' && (
          p.isDesktop ? (
            <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-x-16 items-start">
              <div>
                {p.today}
                {p.todayBelow}
              </div>
              <div className="sticky top-28 h-[calc(100vh-9rem)] flex flex-col">{p.todaySide}</div>
            </div>
          ) : (
            p.today
          )
        )}
        {p.tab === 'history' && <div className="max-w-3xl mx-auto">{p.history}</div>}
        {p.tab === 'whisper' && <div className="max-w-2xl mx-auto">{p.whisper}</div>}
      </main>

      {/* スマホのタブ：文字だけ。今の画面は太字＋下線 */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--p-paper)] border-t-2 border-[var(--p-ink)] grid grid-cols-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="画面の切り替え"
      >
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={tapFor(t.key)}
            aria-current={p.tab === t.key ? 'page' : undefined}
            className="py-3 text-base"
          >
            <span className={`pb-0.5 border-b-2 ${p.tab === t.key ? 'font-bold border-[var(--p-ink)]' : 'p-sub border-transparent'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
