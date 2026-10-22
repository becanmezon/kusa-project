import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { CatchGame, GAME_SECONDS, W, H, multiplierFor, type GameSnapshot } from '../lib/catchGame'

const RULES: { emoji: string; text: string }[] = [
  { emoji: '🍅🥕🍆', text: '野菜をキャッチで10点' },
  { emoji: '🐛', text: '虫をキャッチするとハートが減る（3回でおしまい）' },
]

export function CatchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<CatchGame | null>(null)
  const [snap, setSnap] = useState<GameSnapshot | null>(null)

  useEffect(() => {
    document.title = '野菜キャッチ | 草プロジェクト'
    const canvas = canvasRef.current!
    const game = new CatchGame(canvas, setSnap)
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
      <header className="bg-soil-900 text-white px-4 lg:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-soil-200 hover:text-white text-sm">
          <ArrowLeft size={18} /> 草プロジェクトに戻る
        </Link>
        <h1 className="font-bold text-lg">🧺 野菜キャッチ</h1>
        <div className="flex items-center gap-1 text-sm text-soil-200">
          <Trophy size={16} className="text-yellow-400" /> ベスト {s?.best ?? 0}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-[min(1200px,calc((100vh-9rem)*1.6))]">
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
            className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-leaf-200 cursor-none"
            onPointerMove={onPointerMove}
          >
            <canvas ref={canvasRef} className="block w-full" style={{ aspectRatio: `${W} / ${H}` }} />

            {s?.phase === 'ready' && (
              <Overlay>
                <h2 className="text-3xl font-extrabold text-leaf-700 mb-2">🧺 野菜キャッチ</h2>
                <p className="text-soil-600 mb-5">【鬼むず】大量に落ちてくる中から野菜だけをキャッチしよう！制限時間は{GAME_SECONDS}秒</p>
                <ul className="text-left inline-flex flex-col gap-1.5 mb-5">
                  {RULES.map((r) => (
                    <li key={r.text} className="flex items-center gap-3">
                      <span className="w-20 text-right text-xl">{r.emoji}</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
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
                {s.isNewBest && <p className="text-yellow-600 font-bold mb-1">🏆 自己ベスト更新！</p>}
                <p className="text-soil-600 mb-1">キャッチした野菜：{s.caught}個</p>
                <p className="text-sm text-soil-400 mb-5">これまでのベスト：{s.best}点</p>
                <StartButton onClick={() => gameRef.current?.start()} label="もう一回" icon />
                <p className="text-xs text-soil-400 mt-2">スペースキーでもう一回</p>
              </Overlay>
            )}
          </div>
        </div>
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
      className="flex items-center gap-2 bg-leaf-600 hover:bg-leaf-700 text-white font-bold text-xl rounded-full px-10 py-4 shadow-md"
    >
      {icon && <RotateCcw size={20} />}{label}
    </button>
  )
}
