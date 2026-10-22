// 野菜キャッチ：上から落ちてくる野菜をカゴで受け止めるPC向けゲーム
// 描画は canvas（論理サイズ W×H を表示サイズに合わせて拡大）

export const W = 960
export const H = 600
export const GAME_SECONDS = 60
const MAX_LIFE = 3
const BASKET_W = 110
const BASKET_H = 54
const BASKET_Y = H - 70
const KEY_SPEED = 720 // px/秒

type Kind = 'veg' | 'gold' | 'bad' | 'water'

interface ItemDef {
  emoji: string
  kind: Kind
  points: number
  weight: number // 出やすさ
}

// 野菜は3種類、ダメなもの（虫）は1種類。虫が半分近く落ちてくる鬼モード
const ITEMS: ItemDef[] = [
  { emoji: '🍅', kind: 'veg', points: 10, weight: 10 },
  { emoji: '🥕', kind: 'veg', points: 10, weight: 10 },
  { emoji: '🍆', kind: 'veg', points: 10, weight: 10 },
  { emoji: '🐛', kind: 'bad', points: 0, weight: 27 },
]
const TOTAL_WEIGHT = ITEMS.reduce((s, i) => s + i.weight, 0)

interface Item {
  def: ItemDef
  x: number
  y: number
  vy: number
  rot: number
  vr: number
  size: number
  baseX: number
  wobble: number // 虫は左右にくねくね動く
}

interface FloatText {
  text: string
  x: number
  y: number
  life: number
  color: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export type Phase = 'ready' | 'playing' | 'paused' | 'over'

export interface GameSnapshot {
  phase: Phase
  score: number
  timeLeft: number
  life: number
  combo: number
  best: number
  caught: number
  isNewBest: boolean
}

const BEST_KEY = 'kusa_catch_best'
function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}
function saveBest(v: number) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* 保存できなくても遊べる */ }
}

export function multiplierFor(combo: number): number {
  return Math.min(5, 1 + Math.floor(combo / 5))
}

export class CatchGame {
  private ctx: CanvasRenderingContext2D
  private items: Item[] = []
  private floats: FloatText[] = []
  private particles: Particle[] = []
  private basketX = W / 2
  private targetX: number | null = null
  private keys = new Set<string>()
  private spawnTimer = 0
  private elapsed = 0
  private lastTs = 0
  private raf = 0
  private shake = 0
  private flash = 0

  phase: Phase = 'ready'
  score = 0
  timeLeft = GAME_SECONDS
  life = MAX_LIFE
  combo = 0
  caught = 0
  best = loadBest()
  isNewBest = false

  private canvas: HTMLCanvasElement
  private onChange: (s: GameSnapshot) => void

  constructor(canvas: HTMLCanvasElement, onChange: (s: GameSnapshot) => void) {
    this.canvas = canvas
    this.onChange = onChange
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d not supported')
    this.ctx = ctx
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
    this.emit()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase, score: this.score, timeLeft: this.timeLeft, life: this.life,
      combo: this.combo, best: this.best, caught: this.caught, isNewBest: this.isNewBest,
    }
  }

  private emit() { this.onChange(this.snapshot()) }

  start() {
    this.items = []
    this.floats = []
    this.particles = []
    this.score = 0
    this.timeLeft = GAME_SECONDS
    this.life = MAX_LIFE
    this.combo = 0
    this.caught = 0
    this.elapsed = 0
    this.spawnTimer = 0.4
    this.isNewBest = false
    this.phase = 'playing'
    this.emit()
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused'
    else if (this.phase === 'paused') this.phase = 'playing'
    this.emit()
  }

  pause() {
    if (this.phase === 'playing') { this.phase = 'paused'; this.emit() }
  }

  // ---- 入力 ----
  /** マウス位置（canvas 内の論理座標）にカゴを寄せる */
  pointTo(x: number) { this.targetX = x }
  keyDown(k: string) { this.keys.add(k); this.targetX = null }
  keyUp(k: string) { this.keys.delete(k) }

  // ---- ループ ----
  private loop(ts: number) {
    const dt = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0
    this.lastTs = ts
    if (this.phase === 'playing') this.update(dt)
    else this.updateEffects(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  /** 経過時間に応じて難しくする（0→1） */
  private get difficulty() { return Math.min(1, this.elapsed / GAME_SECONDS) }

  private update(dt: number) {
    this.elapsed += dt
    const prevSec = Math.ceil(this.timeLeft)
    this.timeLeft = Math.max(0, this.timeLeft - dt)

    // カゴの移動
    const left = this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')
    const right = this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')
    if (left || right) {
      this.basketX += (right ? 1 : 0) * KEY_SPEED * dt - (left ? 1 : 0) * KEY_SPEED * dt
    } else if (this.targetX !== null) {
      this.basketX += (this.targetX - this.basketX) * Math.min(1, dt * 18)
    }
    this.basketX = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, this.basketX))

    // 出現
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawn()
      const d = this.difficulty
      this.spawnTimer = 0.2 - 0.1 * d + Math.random() * 0.1
    }

    // 落下と当たり判定
    const bx = this.basketX
    const top = BASKET_Y - BASKET_H / 2
    for (const it of this.items) {
      it.y += it.vy * dt
      it.rot += it.vr * dt
      if (it.wobble) {
        it.x = Math.max(30, Math.min(W - 30, it.baseX + Math.sin(it.y / 70) * it.wobble))
      }
    }
    const keep: Item[] = []
    for (const it of this.items) {
      const r = it.size * 0.4
      const inX = Math.abs(it.x - bx) < BASKET_W / 2 + r * 0.4
      if (inX && it.y + r >= top && it.y - r <= top + 18) {
        this.catchItem(it)
        continue
      }
      if (it.y - r > H) {
        if (it.def.kind === 'veg' || it.def.kind === 'gold') {
          if (this.combo > 0) this.addFloat('コンボ終了', Math.max(80, Math.min(W - 80, it.x)), H - 70, '#8a7a66')
          this.combo = 0
        }
        continue
      }
      keep.push(it)
    }
    this.items = keep

    this.updateEffects(dt)

    if (this.timeLeft <= 0 || this.life <= 0) this.finish()
    else if (Math.ceil(this.timeLeft) !== prevSec) this.emit()
  }

  private updateEffects(dt: number) {
    for (const f of this.floats) { f.y -= 50 * dt; f.life -= dt }
    this.floats = this.floats.filter((f) => f.life > 0)
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt }
    this.particles = this.particles.filter((p) => p.life > 0)
    this.shake = Math.max(0, this.shake - dt)
    this.flash = Math.max(0, this.flash - dt)
  }

  private spawn() {
    let r = Math.random() * TOTAL_WEIGHT
    let def = ITEMS[0]
    for (const it of ITEMS) { r -= it.weight; if (r <= 0) { def = it; break } }
    const d = this.difficulty
    const size = def.kind === 'gold' ? 58 : 52
    const x = 40 + Math.random() * (W - 80)
    this.items.push({
      def,
      x,
      baseX: x,
      wobble: def.kind === 'bad' ? 40 + Math.random() * 60 : 0,
      y: -size,
      vy: (280 + 360 * d + Math.random() * 160) * (def.kind === 'gold' ? 1.25 : 1),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 3,
      size,
    })
  }

  private catchItem(it: Item) {
    const { kind, points } = it.def
    if (kind === 'bad') {
      this.life -= 1
      this.combo = 0
      this.shake = 0.3
      this.flash = 0.25
      this.addFloat('虫だ！', it.x, BASKET_Y - 50, '#c0392b')
      this.burst(it.x, BASKET_Y - 20, '#c0392b', 10)
    } else if (kind === 'water') {
      this.timeLeft = Math.min(GAME_SECONDS, this.timeLeft + 5)
      this.addFloat('+5秒', it.x, BASKET_Y - 50, '#2f80ed')
      this.burst(it.x, BASKET_Y - 20, '#4fa3ff', 14)
    } else {
      this.combo += 1
      this.caught += 1
      const mul = multiplierFor(this.combo)
      const gained = points * mul
      this.score += gained
      const color = kind === 'gold' ? '#d4a017' : '#4f7a2e'
      this.addFloat(`+${gained}${mul > 1 ? ` ×${mul}` : ''}`, it.x, BASKET_Y - 50, color)
      this.burst(it.x, BASKET_Y - 20, kind === 'gold' ? '#f5c518' : '#8bc34a', kind === 'gold' ? 22 : 8)
      if (this.combo > 0 && this.combo % 5 === 0 && mul <= 5) {
        this.addFloat(`${this.combo}コンボ！`, W / 2, H / 2 - 40, '#c96a3f', 1.2)
      }
    }
    this.emit()
  }

  private finish() {
    this.phase = 'over'
    if (this.score > this.best) {
      this.best = this.score
      this.isNewBest = true
      saveBest(this.score)
    }
    this.emit()
  }

  private addFloat(text: string, x: number, y: number, color: string, life = 0.8) {
    this.floats.push({ text, x, y, life, color })
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 120 + Math.random() * 220
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, life: 0.6, color })
    }
  }

  // ---- 描画 ----
  private draw() {
    const ctx = this.ctx
    const c = this.canvas
    const scale = c.width / W
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 12 * this.shake, (Math.random() - 0.5) * 12 * this.shake)
    }

    // 空
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#dff0ff')
    sky.addColorStop(1, '#f6f3e9')
    ctx.fillStyle = sky
    ctx.fillRect(-20, -20, W + 40, H + 40)

    // 雲
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (const [cx, cy, s] of [[150, 90, 1], [520, 60, 0.8], [800, 120, 1.1]] as const) {
      const off = ((this.lastTs / 1000) * 8 * s) % (W + 200)
      const x = ((cx + off) % (W + 200)) - 100
      ctx.beginPath()
      ctx.arc(x, cy, 26 * s, 0, Math.PI * 2)
      ctx.arc(x + 30 * s, cy - 12 * s, 32 * s, 0, Math.PI * 2)
      ctx.arc(x + 64 * s, cy, 24 * s, 0, Math.PI * 2)
      ctx.fill()
    }

    // 畑（地面）
    ctx.fillStyle = '#8b5e3c'
    ctx.fillRect(-20, H - 30, W + 40, 50)
    ctx.fillStyle = '#6fa83c'
    ctx.fillRect(-20, H - 38, W + 40, 10)

    // 落下物
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const it of this.items) {
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot)
      if (it.def.kind === 'gold') {
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 24
        ctx.font = `${it.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
        ctx.fillText(it.def.emoji, 0, 0)
        ctx.globalCompositeOperation = 'source-atop'
        ctx.fillStyle = 'rgba(255,200,0,0.55)'
        ctx.fillRect(-it.size, -it.size, it.size * 2, it.size * 2)
      } else {
        ctx.font = `${it.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
        ctx.fillText(it.def.emoji, 0, 0)
      }
      ctx.restore()
    }

    // カゴ
    this.drawBasket(this.basketX)

    // パーティクル
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.6)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // 得点などの文字
    ctx.font = 'bold 26px -apple-system,"Hiragino Sans","Yu Gothic UI",sans-serif'
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 0.4)
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.strokeText(f.text, f.x, f.y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, f.x, f.y)
    }
    ctx.globalAlpha = 1

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(192,57,43,${this.flash})`
      ctx.fillRect(-20, -20, W + 40, H + 40)
    }
  }

  private drawBasket(x: number) {
    const ctx = this.ctx
    const y = BASKET_Y
    const w = BASKET_W
    const h = BASKET_H
    // 持ち手
    ctx.strokeStyle = '#7a4f2a'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(x, y - h / 2 + 4, w * 0.36, Math.PI, 0)
    ctx.stroke()
    // 本体（台形）
    ctx.fillStyle = '#c68a4e'
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y - h / 2)
    ctx.lineTo(x + w / 2, y - h / 2)
    ctx.lineTo(x + w / 2 - 14, y + h / 2)
    ctx.lineTo(x - w / 2 + 14, y + h / 2)
    ctx.closePath()
    ctx.fill()
    // 編み目
    ctx.strokeStyle = '#9c6534'
    ctx.lineWidth = 2
    for (let i = 1; i < 3; i++) {
      const yy = y - h / 2 + (h / 3) * i
      const inset = 14 * ((yy - (y - h / 2)) / h)
      ctx.beginPath()
      ctx.moveTo(x - w / 2 + inset, yy)
      ctx.lineTo(x + w / 2 - inset, yy)
      ctx.stroke()
    }
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * (w / 6), y - h / 2)
      ctx.lineTo(x + i * ((w - 28) / 6), y + h / 2)
      ctx.stroke()
    }
    // ふち
    ctx.fillStyle = '#7a4f2a'
    ctx.fillRect(x - w / 2 - 4, y - h / 2 - 6, w + 8, 10)
  }
}
