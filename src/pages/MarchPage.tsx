import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { MarchGame, MW, MH, type MarchSnapshot } from '../lib/marchGame'

/** めばえ大行進（試作）：ゲートで仲間を増やし、水てっぽうで虫を追い払う */
export function MarchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<MarchGame | null>(null)
  const [snap, setSnap] = useState<MarchSnapshot | null>(null)

  useEffect(() => {
    document.title = 'めばえ大行進 | 草プロジェクト'
    const game = new MarchGame(canvasRef.current!, setSnap)
    gameRef.current = game
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') game.setKey('left', down)
      else if (e.key === 'ArrowRight' || e.key === 'd') game.setKey('right', down)
      else if (down && e.key === ' ' && game.phase !== 'playing' && game.phase !== 'paused') { e.preventDefault(); game.start() }
      else if (down && (e.key === 'p' || e.key === 'P')) game.togglePause()
    }
    const onDown = key(true)
    const onUp = key(false)
    const onHide = () => { if (document.hidden && game.phase === 'playing') game.togglePause() }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      game.destroy()
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  const onPointer = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    gameRef.current?.pointTo(((e.clientX - rect.left) / rect.width) * MW)
  }

  const s = snap
  const overlay = 'absolute inset-0 bg-cream/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-5 overflow-y-auto'

  return (
    <div className="h-dvh bg-cream flex flex-col">
      <header className="bg-sky border-b-2 border-ink px-4 py-2 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-ink rounded-full px-3 py-1 whitespace-nowrap">
          <ArrowLeft size={18} /> 戻る
        </Link>
        <h1 className="font-black text-base sm:text-lg whitespace-nowrap">めばえ大行進<span className="ml-1.5 text-xs font-bold text-ink/70">試作版</span></h1>
        <div className="flex items-center gap-1 text-sm font-bold whitespace-nowrap tabular-nums">
          <Trophy size={16} /> {s?.best ?? 0}
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center px-3 py-2 gap-2">
        {/* 上の段：点数・進み具合・一時停止 */}
        <div className="w-full max-w-[min(30rem,calc((100dvh-8.5rem)*0.6))] flex items-center gap-3">
          <span className="font-black text-xl tabular-nums">{s?.score ?? 0}<span className="text-xs ml-0.5">点</span></span>
          <div className="flex-1 h-3 rounded-full border-2 border-ink bg-white overflow-hidden" aria-label="ゴールまでの進み具合">
            <div
              className="h-full"
              style={s && s.bossHp >= 0
                ? { width: `${s.bossHp * 100}%`, backgroundColor: '#F4895F' }
                : { width: `${(s?.progress ?? 0) * 100}%`, backgroundColor: '#8CC63F' }}
            />
          </div>
          <span className="text-xs font-bold whitespace-nowrap w-16 text-right">{s && s.bossHp >= 0 ? 'ボスの体力' : 'ボスまで'}</span>
          <button
            onClick={() => gameRef.current?.togglePause()}
            disabled={!s || (s.phase !== 'playing' && s.phase !== 'paused')}
            className="p-1 disabled:opacity-30"
            aria-label="一時停止"
          >
            {s?.phase === 'paused' ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>

        <div
          className="hand-card relative overflow-hidden touch-none select-none w-full max-w-[min(30rem,calc((100dvh-8.5rem)*0.6))]"
          style={{ aspectRatio: `${MW} / ${MH}` }}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {s?.phase === 'ready' && (
            <div className={overlay}>
              <h2 className="text-2xl font-black mb-3">めばえ大行進</h2>
              <ul className="text-left text-sm flex flex-col gap-1.5 mb-4">
                <li><b className="px-1.5 rounded border-2 border-ink" style={{ backgroundColor: '#5AA9E6' }}>＋</b> 青いゲートをくぐると仲間が増える</li>
                <li><b className="px-1.5 rounded border-2 border-ink" style={{ backgroundColor: '#F4895F' }}>−</b> 赤いゲートは仲間が減る</li>
                <li>ゲートを水で撃つと、数字が上がる</li>
                <li>虫にぶつかると仲間が減る。0人になったらおしまい</li>
                <li>最後のボスを追い払えばクリア</li>
              </ul>
              <p className="text-xs text-ink/70 mb-4">操作：指やマウスを左右に動かす（← → キーでもOK）</p>
              <StartButton onClick={() => gameRef.current?.start()} label="スタート" />
            </div>
          )}
          {s?.phase === 'paused' && (
            <div className={overlay}>
              <h2 className="text-2xl font-black mb-4">一時停止中</h2>
              <StartButton onClick={() => gameRef.current?.togglePause()} label="つづける" />
            </div>
          )}
          {s?.phase === 'over' && (
            <div className={overlay}>
              <p className="text-sm text-ink/70 mb-1">{s.win ? 'ボスを追い払った！' : '仲間がいなくなった…'}</p>
              <h2 className="text-5xl font-black tabular-nums mb-2">{s.score}<span className="text-xl ml-1">点</span></h2>
              {s.win && <p className="text-sm font-bold mb-1">残った仲間 {s.count}人（1人50点）＋クリア1000点</p>}
              {s.isNewBest && <p className="text-sm font-black mb-1" style={{ color: '#d9603a' }}>自己ベスト更新！</p>}
              <div className="mt-3"><StartButton onClick={() => gameRef.current?.start()} label="もう一回" icon /></div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StartButton({ onClick, label, icon }: { onClick: () => void; label: string; icon?: boolean }) {
  return (
    <button onClick={onClick} className="hand-btn flex items-center gap-2 bg-grass font-black text-lg px-8 py-3">
      {icon && <RotateCcw size={20} />}{label}
    </button>
  )
}
