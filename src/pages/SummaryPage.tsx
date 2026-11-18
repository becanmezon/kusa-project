import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight,
  Feather, Heart, MessageCircle, Camera, Loader2,
} from 'lucide-react'
import { LogoSprout, Medal, WateringCanIcon, DoneMark, MissMark, RainCloudIcon } from '../components/illust/Illust'
import {
  fetchWaterings, fetchShifts, fetchPosts, fetchReactions, fetchReplies,
  fetchVegetables, getVegetableImageUrl,
} from '../lib/db'
import { today } from '../lib/utils'
import {
  buildMonthlySummary, monthRange, rankPlaces, shiftMonth, type MonthlySummary,
} from '../lib/monthlySummary'

const MONTH_RE = /^\d{4}-\d{2}$/

export function SummaryPage() {
  const [params, setParams] = useSearchParams()
  const todayStr = today()
  const thisMonth = todayStr.slice(0, 7)
  const paramMonth = params.get('month')
  // 指定がなければ先月のまとめ
  const month = paramMonth && MONTH_RE.test(paramMonth) ? paramMonth : shiftMonth(thisMonth, -1)

  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)

  useEffect(() => {
    document.title = '月のまとめ | 草プロジェクト'
  }, [])

  useEffect(() => {
    let cancelled = false
    const { from, to } = monthRange(month)
    Promise.all([
      fetchWaterings(from, to),
      fetchShifts(from, to),
      fetchPosts(),
      fetchReactions(),
      fetchReplies(),
      fetchVegetables().catch(() => []),
    ])
      .then(([waterings, shifts, posts, reactions, replies, vegetables]) => {
        if (cancelled) return
        setSummary(buildMonthlySummary({ month, today: todayStr, waterings, shifts, posts, reactions, replies, vegetables }))
        setError(null)
        setLoadedMonth(month)
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setError('データを読み込めませんでした。通信状況を確認して、もう一度開いてください。')
        setLoadedMonth(month)
      })
    return () => { cancelled = true }
  }, [month, todayStr])

  const loading = loadedMonth !== month
  const goMonth = (diff: number) => setParams({ month: shiftMonth(month, diff) })
  const canGoNext = month < thisMonth
  const [y, m] = month.split('-').map(Number)

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* 左上の「草プロジェクト」を押すと戻る（メイン画面のヘッダーと同じ位置・形） */}
      <header className="bg-sky border-b-2 border-ink px-4 lg:px-8 py-2.5 lg:py-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link
          to="/?tab=history"
          className="justify-self-start flex items-center gap-2 rounded-full -ml-1 pl-1 pr-3 py-0.5 hover:bg-white/50"
          aria-label="草プロジェクトに戻る"
        >
          <LogoSprout size={34} className="lg:w-11 lg:h-11" />
          <span className="font-black text-lg lg:text-2xl">草プロジェクト</span>
        </Link>
        <h1 className="font-black text-base lg:text-lg">月のまとめ</h1>
        <span />
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-16 flex flex-col gap-4">
        {/* 月の切り替え */}
        <div className="flex items-center justify-between">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-full hover:bg-soil-100" aria-label="前の月">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <div className="text-sm text-soil-500">{y}年</div>
            <div className="text-3xl font-extrabold text-leaf-700">{m}月のまとめ</div>
            {summary?.isPartial && !loading && (
              <div className="text-xs text-terra-600 mt-1">今月は {Number(summary.toDate.slice(8))}日までの途中経過です</div>
            )}
          </div>
          <button
            onClick={() => goMonth(1)}
            disabled={!canGoNext}
            className="p-2 rounded-full hover:bg-soil-100 disabled:opacity-20"
            aria-label="次の月"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-20 text-leaf-600"><Loader2 className="animate-spin" size={32} /></div>
        )}
        {!loading && error && (
          <div className="bg-white rounded-2xl p-6 text-center text-terra-700">{error}</div>
        )}
        {!loading && !error && summary && <SummaryBody s={summary} />}
      </main>
    </div>
  )
}

function SummaryBody({ s }: { s: MonthlySummary }) {
  return (
    <>
      <RateCard s={s} />


      <Card icon={<Feather size={18} className="text-leaf-600" />} title="W のふりかえり">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <MiniStat label="投稿" value={s.postCount} unit="件" />
          <MiniStat label="リアクション" value={s.reactionTotal} unit="" />
          <MiniStat label="返信" value={s.replyTotal} unit="件" />
        </div>
        {s.popular.length === 0 ? (
          <Empty>この月の人気投稿はありません</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold text-soil-600">人気の投稿</div>
            {s.popular.map((p, i) => (
              <div key={p.post.id} className="flex gap-3 bg-paper border-2 border-ink/15 rounded-xl p-3">
                <Medal place={i} size={30} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-soil-800">{p.post.by_name}</div>
                  {p.post.body && <p className="text-sm text-soil-700 whitespace-pre-wrap line-clamp-3">{p.post.body}</p>}
                  <div className="flex gap-3 text-xs text-soil-500 mt-1">
                    <span className="flex items-center gap-1"><Heart size={12} />{p.reactionCount}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} />{p.replyCount}</span>
                  </div>
                </div>
                {p.post.image_paths?.[0] && (
                  <img
                    src={getVegetableImageUrl(p.post.image_paths[0])}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {s.posters.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-bold text-soil-600 mb-2">よく投稿した人</div>
            <RankList entries={s.posters.slice(0, 3)} unit="件" />
          </div>
        )}
      </Card>

      {s.vegetableCount > 0 && (
        <Card icon={<Camera size={18} className="text-terra-500" />} title="野菜の写真">
          <p className="text-soil-700">この月は <b className="text-2xl text-leaf-700">{s.vegetableCount}</b> 枚の写真が追加されました</p>
        </Card>
      )}

    </>
  )
}

function RateCard({ s }: { s: MonthlySummary }) {
  const r = 52
  const c = 2 * Math.PI * r
  const color = s.rate >= 90 ? '#4f7a2e' : s.rate >= 70 ? '#6fa83c' : s.rate >= 50 ? '#e0a030' : '#c96a3f'
  return (
    <Card icon={<WateringCanIcon size={24} />} title="水やり達成率">
      <div className="flex items-center gap-6">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#ece6d6" strokeWidth="12" />
            <circle
              cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - s.rate / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold tabular-nums" style={{ color }}>{s.rate}<span className="text-lg">%</span></span>
            <span className="text-xs text-soil-500">{s.done}/{s.required}回</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <Row icon={<DoneMark size={20} />} label="水やり" value={s.watered} />
          <Row icon={<RainCloudIcon size={22} />} label="雨" value={s.rain} />
          <Row icon={<MissMark size={20} />} label="記録なし" value={s.missed} />
        </div>
      </div>
      <p className="text-xs text-soil-400 mt-3">
        担当者がいた枠（朝・夜）のうち、「水やりした」か「雨だった」が記録された割合です。
        {s.dualSlotFrom && s.dualSlotFrom > s.fromDate && ` ${Number(s.dualSlotFrom.slice(5, 7))}/${Number(s.dualSlotFrom.slice(8))}からは朝と夜の2枠で数えています。`}
      </p>
    </Card>
  )
}


function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="hand-card p-5">
      <h2 className="flex items-center gap-2 font-black text-lg mb-4">{icon}{title}</h2>
      {children}
    </section>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-soil-700">
      {icon}<span className="flex-1">{label}</span><span className="font-bold tabular-nums text-lg">{value}<span className="text-sm ml-0.5">回</span></span>
    </div>
  )
}

function MiniStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-paper border-2 border-ink/15 rounded-xl py-3 text-center">
      <div className="text-2xl font-extrabold text-leaf-700 tabular-nums">{value}<span className="text-sm">{unit}</span></div>
      <div className="text-xs text-soil-500">{label}</div>
    </div>
  )
}

function RankList({ entries, unit }: { entries: { name: string; count: number }[]; unit: string }) {
  const max = Math.max(...entries.map((e) => e.count), 1)
  const places = rankPlaces(entries.map((e) => e.count))
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e, i) => {
        const place = places[i]
        return (
          <li key={e.name} className="flex items-center gap-3">
            <Medal place={place} size={26} className="shrink-0" />
            <span className="w-20 truncate text-soil-800">{e.name}</span>
            <div className="flex-1 h-3.5 bg-paper border-2 border-ink/20 rounded-full overflow-hidden">
              <div className="h-full bg-grass border-r-2 border-ink rounded-full" style={{ width: `${(e.count / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right font-bold tabular-nums">{e.count}{unit}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-soil-400 text-center py-4">{children}</p>
}
