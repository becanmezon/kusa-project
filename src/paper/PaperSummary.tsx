// 紙の版：月のまとめ（数字を大きく組み、ランキングは「正」の字で数える）
import { Link } from 'react-router-dom'
import type { MonthlySummary } from '../lib/monthlySummary'

/** 正の字（5本で1文字）。書き順どおりに1本ずつ足す */
function Tally({ count }: { count: number }) {
  const strokes = ['M3 3.5 H17', 'M10 3.5 V17', 'M10 10 H15.5', 'M5 9 V17', 'M2 17 H18']
  const full = Math.floor(count / 5)
  const rest = count % 5
  const glyph = (n: number, key: number) => (
    <svg key={key} viewBox="0 0 20 20" className="w-5 h-5 shrink-0" aria-hidden="true">
      <g stroke="var(--p-ink)" strokeWidth={1.9} strokeLinecap="round" fill="none">
        {strokes.slice(0, n).map(d => <path key={d} d={d} />)}
      </g>
    </svg>
  )
  return (
    <span className="inline-flex flex-wrap gap-0.5" role="img" aria-label={`${count}回`}>
      {Array.from({ length: full }, (_, i) => glyph(5, i))}
      {rest > 0 && glyph(rest, full)}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="p-head text-xl lg:text-2xl mb-3">{children}</h2>
}

function TallyTable({ entries, unit }: { entries: { name: string; count: number }[]; unit: string }) {
  const places = entries.map(e => entries.findIndex(x => x.count === e.count))
  return (
    <table className="w-full border-collapse">
      <tbody>
        {entries.map((e, i) => (
          <tr key={e.name} className="border-b p-rule">
            <td className="py-2 pr-3 w-8 p-num p-sub text-right">{places[i] + 1}</td>
            <td className="py-2 pr-4 w-28 font-bold whitespace-nowrap">{e.name}</td>
            <td className="py-2 pr-4"><Tally count={e.count} /></td>
            <td className="py-2 w-14 text-right p-num font-bold">{e.count}<span className="text-xs p-sub ml-0.5 font-normal">{unit}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface Props {
  y: number
  m: number
  summary: MonthlySummary | null
  loading: boolean
  error: string | null
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function PaperSummary({ y, m, summary: s, loading, error, canGoNext, onPrev, onNext }: Props) {
  const prevM = m === 1 ? 12 : m - 1
  const nextM = m === 12 ? 1 : m + 1
  return (
    <div className="paper min-h-screen">
      <header className="px-4 lg:px-[8vw]">
        <div className="flex items-end justify-between gap-4 pt-3 lg:pt-5 pb-2">
          <span className="p-head text-xl lg:text-3xl">草プロジェクト</span>
          <Link to="/paper?tab=history" className="text-sm lg:text-base p-sub underline underline-offset-4">← 当番表に戻る</Link>
        </div>
        <div className="border-t-2 border-[var(--p-ink)]" />
        <div className="border-t border-[var(--p-ink)] mt-[3px]" />
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 pb-16">
        {/* 月の切り替え */}
        <nav className="flex items-end justify-between gap-4 pb-4 border-b p-rule" aria-label="月の切り替え">
          <button onClick={onPrev} className="p-sub underline underline-offset-4 pb-1">‹ {prevM}月</button>
          <div className="text-center">
            <p className="text-sm p-sub p-num">{y}年</p>
            <h1 className="p-head text-4xl lg:text-5xl leading-tight">{m}月のまとめ</h1>
            {s?.isPartial && !loading && (
              <p className="text-xs p-sub mt-1">今月は <span className="p-num">{Number(s.toDate.slice(8))}</span>日までの途中経過です</p>
            )}
          </div>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={`underline underline-offset-4 pb-1 ${canGoNext ? 'p-sub' : 'invisible'}`}
          >{nextM}月 ›</button>
        </nav>

        {loading && <p className="py-20 text-center p-sub">読み込み中…</p>}
        {!loading && error && <p className="py-20 text-center" style={{ color: 'var(--p-miss)' }}>{error}</p>}
        {!loading && !error && s && <Body s={s} />}
      </main>
    </div>
  )
}

function Body({ s }: { s: MonthlySummary }) {
  return (
    <>
      {/* 水やり達成率：数字を大きく */}
      <section className="py-8 border-b p-rule">
        <SectionTitle>水やり達成率</SectionTitle>
        <p className="flex items-baseline flex-wrap gap-x-6 gap-y-2">
          <span className="p-head text-[4.5rem] lg:text-[6rem] leading-none p-num">
            {s.done}<span className="text-[0.5em] p-sub">/{s.required}</span><span className="text-[0.3em] font-bold ml-1">回</span>
          </span>
          <span className="p-num text-3xl lg:text-4xl font-bold" style={{ color: 'var(--p-leaf)' }}>{s.rate}%</span>
        </p>
        <dl className="mt-5 grid grid-cols-3 max-w-md text-center border-t border-b p-rule divide-x divide-[var(--p-rule)]">
          {[
            { label: '水やり', value: s.watered, cls: 'p-state-done' },
            { label: '雨', value: s.rain, cls: 'p-state-rain' },
            { label: '記録なし', value: s.missed, cls: 'p-state-miss' },
          ].map(r => (
            <div key={r.label} className="py-3">
              <dt className="mb-1"><span className={`p-state ${r.cls}`}>{r.label}</span></dt>
              <dd className="p-num text-2xl font-bold">{r.value}<span className="text-sm p-sub font-normal ml-0.5">回</span></dd>
            </div>
          ))}
        </dl>
        <p className="text-xs p-sub mt-3">
          担当者がいた枠（朝・夜）のうち、「水やりした」か「雨だった」が記録された割合です。
          {s.dualSlotFrom && s.dualSlotFrom > s.fromDate && ` ${Number(s.dualSlotFrom.slice(5, 7))}/${Number(s.dualSlotFrom.slice(8))}からは朝と夜の2枠で数えています。`}
        </p>
      </section>


      <section className="py-8 border-b p-rule">
        <SectionTitle>W のふりかえり</SectionTitle>
        <p className="flex flex-wrap gap-x-8 gap-y-1 text-lg mb-6">
          <span>投稿 <span className="p-num text-3xl font-bold">{s.postCount}</span>件</span>
          <span>リアクション <span className="p-num text-3xl font-bold">{s.reactionTotal}</span></span>
          <span>返信 <span className="p-num text-3xl font-bold">{s.replyTotal}</span>件</span>
        </p>
        <h3 className="font-bold mb-2">人気の投稿</h3>
        {s.popular.length === 0 ? (
          <p className="p-sub mb-6">この月の人気投稿はありません</p>
        ) : (
          <ol className="mb-6">
            {s.popular.map((p, i) => (
              <li key={p.post.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 py-3 border-t p-rule">
                <span className="p-head text-2xl leading-none">{i + 1}</span>
                <div>
                  <p className="font-bold">{p.post.by_name}</p>
                  {p.post.body && <p className="whitespace-pre-wrap line-clamp-3">{p.post.body}</p>}
                  <p className="text-sm p-sub mt-1">
                    リアクション <span className="p-num">{p.reactionCount}</span>
                    <span className="ml-4">返信 <span className="p-num">{p.replyCount}</span></span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {s.posters.length > 0 && (
          <>
            <h3 className="font-bold mb-2">よく投稿した人</h3>
            <TallyTable entries={s.posters.slice(0, 3)} unit="件" />
          </>
        )}
      </section>

      {s.vegetableCount > 0 && (
        <section className="py-8 border-b p-rule">
          <SectionTitle>野菜の写真</SectionTitle>
          <p className="text-lg">この月は <span className="p-num text-3xl font-bold">{s.vegetableCount}</span> 枚の写真が追加されました</p>
        </section>
      )}

    </>
  )
}

