import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { spriteUrl, type SpriteName } from '../lib/catchSprites'
import { CatchGame, GAME_SECONDS, LIFE_BONUS, W, H, multiplierFor, type GameSnapshot } from '../lib/catchGame'
import { fetchCatchRanking, submitCatchScore, type CatchRankEntry } from '../lib/db'
import { getSavedName } from '../lib/utils'

const RULES: { sprites: SpriteName[]; text: string }[] = [
  { sprites: ['tomato', 'carrot', 'eggplant'], text: '野菜をキャッチで10点' },
  { sprites: ['bug'], text: '虫をキャッチするとハートが減る（3回でおしまい）' },
]
const BONUS_TEXT = `60秒たったときに残っていたハート：1個 +${LIFE_BONUS[1]}点／2個 +${LIFE_BONUS[2]}点／3個 +${LIFE_BONUS[3]}点`

type RankState = { status: 'loading' | 'ok' | 'error'; list: CatchRankEntry[] }
type SubmitState = 'idle' | 'sending' | 'done' | 'failed' | 'noname'

export function CatchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<CatchGame | null>(null)
  const [snap, setSnap] = useState<GameSnapshot | null>(null)
  const [rank, setRank] = useState<RankState>({ status: 'loading', list: [] })
  const [submit, setSubmit] = useState<SubmitState>('idle')
  // 草プロジェクトで選んでいる名前でランキングに載せる
  const [playerName] = useState(() => getSavedName())

  const loadRanking = () => {
    fetchCatchRanking(10)
      .then((list) => setRank({ status: 'ok', list }))
      .catch((e) => { console.error(e); setRank((r) => ({ status: 'error', list: r.list })) })
  }
  useEffect(loadRanking, [])

  // ゲームが終わった瞬間に1回だけ点数を送る（ゲームからの通知の中で判定する）
  const prevPhase = useRef<GameSnapshot['phase'] | null>(null)
  const onSnapshot = useRef<(next: GameSnapshot) => void>(() => {})
  useEffect(() => { onSnapshot.current = (next) => {
    setSnap(next)
    const was = prevPhase.current
    prevPhase.current = next.phase
    if (next.phase === 'playing' && was !== 'paused') setSubmit('idle')
    if (next.phase !== 'over' || was === 'over') return
    if (!playerName) { setSubmit('noname'); return }
    if (next.score <= 0) return
    setSubmit('sending')
    submitCatchScore(playerName, next.score)
      .then(() => { setSubmit('done'); loadRanking() })
      .catch((e) => { console.error(e); setSubmit('failed') })
  } })

  useEffect(() => {
    document.title = '野菜キャッチ | 草プロジェクト'
    const canvas = canvasRef.current!
    const game = new CatchGame(canvas, (next) => onSnapshot.current(next))
    gameRef.current = game

    // 表示サイズに合わせて canvas の解像度を調整
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round((rect.width * H / W) * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
      if (e.key === ' ' || e.key === 'Enter') {
        if (game.phase === 'ready' || game.phase === 'over') game.start()
        else game.togglePause()
        return
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { game.togglePause(); return }
      game.keyDown(e.key)
    }
    const onKeyUp = (e: KeyboardEvent) => game.keyUp(e.key)
    const onVisibility = () => { if (document.hidden) game.pause() }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    const onBlur = () => game.pause()
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      game.destroy()
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    gameRef.current?.pointTo(((e.clientX - rect.left) / rect.width) * W)
  }

  const s = snap
  const timePct = s ? (s.timeLeft / GAME_SECONDS) * 100 : 100
  const mul = s ? multiplierFor(s.combo) : 1

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-sky border-b-2 border-ink px-4 lg:px-6 py-2.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-ink rounded-full px-3 py-1">
          <ArrowLeft size={18} /> 草プロジェクトに戻る
        </Link>
        <h1 className="font-black text-lg">野菜キャッチ</h1>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Trophy size={16} /> ベスト {s?.best ?? 0}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 px-4 py-4">
        <div className="w-full max-w-[min(1000px,calc((100vh-9rem)*1.6))]">
          {/* スコア表示 */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-soil-500">スコア</span>
              <span className="text-3xl font-extrabold text-leaf-700 tabular-nums">{s?.score ?? 0}</span>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <Heart key={i} size={22} className={i < (s?.life ?? 3) ? 'fill-red-500 text-red-500' : 'text-soil-300'} />
              ))}
            </div>
            {s && s.combo >= 2 && (
              <span className="text-terra-600 font-bold">
                {s.combo}コンボ{mul > 1 && <span className="ml-1 bg-terra-500 text-white rounded-full px-2 py-0.5 text-sm">×{mul}</span>}
              </span>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2 w-56">
              <div className="flex-1 h-3 bg-soil-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${timePct < 20 ? 'bg-red-500' : 'bg-leaf-500'}`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              <span className="tabular-nums font-bold w-10 text-right">{Math.ceil(s?.timeLeft ?? GAME_SECONDS)}秒</span>
            </div>
            {s && (s.phase === 'playing' || s.phase === 'paused') && (
              <button
                onClick={() => gameRef.current?.togglePause()}
                className="p-2 rounded-full hover:bg-soil-100"
                aria-label="一時停止"
              >
                {s.phase === 'paused' ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
          </div>

          {/* ゲーム画面 */}
          <div
            ref={wrapRef}
            className="hand-card relative overflow-hidden cursor-none"
            onPointerMove={onPointerMove}
          >
            <canvas ref={canvasRef} className="block w-full" style={{ aspectRatio: `${W} / ${H}` }} />

            {s?.phase === 'ready' && (
              <Overlay>
                <h2 className="text-3xl font-black mb-2">野菜キャッチ</h2>
                <p className="text-soil-600 mb-5">【鬼むず】大量に落ちてくる中から野菜だけをキャッチしよう！制限時間は{GAME_SECONDS}秒</p>
                <ul className="text-left inline-flex flex-col gap-1.5 mb-5">
                  {RULES.map((r) => (
                    <li key={r.text} className="flex items-center gap-3">
                      <span className="w-28 flex justify-end gap-1">
                        {r.sprites.map(sp => <img key={sp} src={spriteUrl(sp)} alt="" className="w-8 h-8" />)}
                      </span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-bold text-soil-700 mb-3">{BONUS_TEXT}</p>
                <p className="text-sm text-soil-500 mb-5">
                  操作：マウスを動かす / ← → キー（A・D でもOK） ／ 一時停止：P キー<br />
                  続けてキャッチするとコンボで得点が最大5倍に
                </p>
                <StartButton onClick={() => gameRef.current?.start()} label="スタート" />
                <p className="text-xs text-soil-400 mt-2">スペースキーでも始められます</p>
              </Overlay>
            )}

            {s?.phase === 'paused' && (
              <Overlay>
                <h2 className="text-3xl font-extrabold text-soil-700 mb-5">一時停止中</h2>
                <StartButton onClick={() => gameRef.current?.togglePause()} label="つづける" />
              </Overlay>
            )}

            {s?.phase === 'over' && (
              <Overlay>
                <p className="text-soil-500 mb-1">{s.life <= 0 ? 'ハートがなくなった…' : 'タイムアップ！'}</p>
                <h2 className="text-6xl font-extrabold text-terra-600 mb-2 tabular-nums">{s.score}<span className="text-2xl ml-1">点</span></h2>
                {s.lifeBonus > 0 && (
                  <p className="font-bold text-soil-700 mb-2 flex items-center gap-1.5 tabular-nums">
                    <span className="flex gap-0.5">
                      {Array.from({ length: s.life }, (_, i) => <Heart key={i} size={16} className="fill-red-500 text-red-500" />)}
                    </span>
                    残りハートボーナス <span className="text-terra-600">+{s.lifeBonus}点</span>
                  </p>
                )}
                {s.isNewBest && <p className="font-black mb-1 bg-sun border-2 border-ink rounded-full px-3 py-0.5">自己ベスト更新！</p>}
                <p className="text-soil-600 mb-1">キャッチした野菜：{s.caught}個</p>
                <SubmitNote state={submit} score={s.score} list={rank.list} me={playerName} />
                <p className="text-sm text-soil-400 mb-5">これまでのベスト：{s.best}点</p>
                <StartButton onClick={() => gameRef.current?.start()} label="もう一回" icon />
                <p className="text-xs text-soil-400 mt-2">スペースキーでもう一回</p>
              </Overlay>
            )}
          </div>
        </div>
        <RankingPanel rank={rank} me={playerName} />
      </main>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 bg-cream/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 cursor-default">
      {children}
    </div>
  )
}

function StartButton({ onClick, label, icon }: { onClick: () => void; label: string; icon?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="hand-btn flex items-center gap-2 bg-grass font-black text-xl px-10 py-4"
    >
      {icon && <RotateCcw size={20} />}{label}
    </button>
  )
}

function SubmitNote({ state, score, list, me }: { state: SubmitState; score: number; list: CatchRankEntry[]; me: string }) {
  if (state === 'sending') return <p className="text-sm text-soil-500 mb-1">ランキングに記録しています…</p>
  if (state === 'done') {
    const i = list.findIndex((r) => r.name === me)
    const mine = i >= 0 ? list[i] : null
    let text: string
    if (!mine) text = 'ランキングに記録しました（10位圏外）'
    else if (score >= mine.score) text = `ランキング ${i + 1}位！`
    else text = `記録しました（自分の最高は ${i + 1}位・${mine.score}点）`
    return <p className="text-sm font-bold mb-1">{text}</p>
  }
  if (state === 'failed') return <p className="text-sm text-terra-700 mb-1">ランキングに記録できませんでした（通信を確認してね）</p>
  if (state === 'noname') return <p className="text-sm text-soil-500 mb-1">草プロジェクトで名前を選ぶと、ランキングに載ります</p>
  return null
}

function RankingPanel({ rank, me }: { rank: RankState; me: string }) {
  return (
    <aside className="soft-card w-full max-w-md lg:w-72 lg:max-w-none shrink-0 overflow-hidden">
      <h2 className="flex items-center gap-2 font-black text-lg px-4 py-3 border-b-2 border-ink/10">
        <Crown size={20} className="text-sun-dark" /> ランキング
        <span className="ml-auto text-xs font-bold text-soil-500">上位10人・1人1回分</span>
      </h2>
      {rank.status === 'loading' && rank.list.length === 0 && (
        <p className="px-4 py-6 text-sm text-soil-500 text-center">読み込み中…</p>
      )}
      {rank.status === 'error' && rank.list.length === 0 && (
        <p className="px-4 py-6 text-sm text-soil-500 text-center">ランキングを読み込めませんでした</p>
      )}
      {rank.status === 'ok' && rank.list.length === 0 && (
        <p className="px-4 py-6 text-sm text-soil-500 text-center">まだ記録がありません。最初の1位になろう！</p>
      )}
      {rank.list.length > 0 && (
        <ol>
          {rank.list.map((r, i) => (
            <li
              key={r.name}
              className={`flex items-center gap-3 px-4 py-2 border-b border-ink/5 last:border-b-0 ${r.name === me ? 'bg-sun/30' : ''}`}
            >
              <span className={`w-7 text-center font-black tabular-nums ${i < 3 ? 'text-terra-600 text-lg' : 'text-soil-500'}`}>{i + 1}</span>
              <span className="flex-1 font-bold truncate">{r.name}</span>
              <span className="font-black tabular-nums">{r.score}<span className="text-xs font-bold ml-0.5">点</span></span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
