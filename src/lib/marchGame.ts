// めばえ大行進（試作）：ゲートをくぐって芽の仲間をどんどん増やし、虫の群れとぶつかり合いながら進むゲーム。
// 「ギリギリでクリアできる」ように、敵の群れとボスの強さは、そのときの仲間の数に合わせて決める。
// 描画はすべて canvas。絵は草プロジェクトの配色（インクの線＋パステルのベタ塗り）で描く。
import { spriteImage } from './catchSprites'

export const MW = 480
export const MH = 800
/** ボスが出てくるまでの時間（秒） */
export const MARCH_SECONDS = 50

const INK = '#2e2924'
const ROAD_L = 60
const ROAD_R = 420
const ROAD_MID = (ROAD_L + ROAD_R) / 2
const SQUAD_Y = 650
const WORLD_SPEED = 190 // 道が流れる速さ（px/秒）
const KEY_SPEED = 560
const MAX_DRAWN = 120 // 画面に描く仲間の上限（数はいくらでも増える）
const SHOTS_PER_SEC = 14 // 見た目の水の粒の数
const HORDE_W = 150 // 虫の群れの横幅
const BOSS_WALK = 11 // ボスが現れてから仲間のところまで来る秒数
const BOSS_MARGIN = 0.9 // ボスの体力＝攻撃を全部よけたときの火力×歩く時間×この値（1に近いほどギリギリ）
const BOSS_THROW_EVERY = 2.2 // ボスが虫を投げる間隔（秒）
const BOSS_THROW_RATE = 0.08 // 投げる虫の数（いまの仲間の数に対する割合）
const FIRE_A = 4
const FIRE_B = 0.12
const HORDE_MIN = 0.45 // 虫の群れの大きさ（いまの仲間の数に対する割合）
const HORDE_MAX = 0.95
const BEST_KEY = 'kusa_march_best'

/** 1秒あたりに倒せる虫の数（仲間が多いほど強い） */
export const firePower = (count: number) => FIRE_A + count * FIRE_B

type GateOp = { kind: 'add' | 'mul' | 'div'; value: number; base: number; hits: number }
interface Gate { y: number; ops: [GateOp, GateOp]; used: boolean }
interface Horde { x: number; y: number; n: number; max: number; hit: number; thrown: boolean; vx: number }
interface Boss { y: number; hp: number; maxHp: number; hit: number; throwTimer: number; bornAt: number }
interface Drop { x: number; y: number }
interface Float { x: number; y: number; text: string; color: string; t: number; big: boolean }
type Ev = { t: number; kind: 'gate' | 'horde' | 'boss' }

export interface MarchSnapshot {
  phase: 'ready' | 'playing' | 'paused' | 'over'
  count: number
  peak: number
  score: number
  best: number
  progress: number // 0〜1（ボスまでの進み具合）
  win: boolean
  bossHp: number // 0〜1。ボスがいないときは -1
  bossLeft: number // ボスが仲間のところに来るまでの残り（0〜1）。最後の「ギリギリ」表示用
  isNewBest: boolean
}

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP')

// 仲間の芽（顔つきの小さな鉢に双葉）
const SPROUT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M24 24 V15" fill="none"/>
<path d="M24 16 C16 16 12 11 12 6 C19 5 24 9 24 16 Z" fill="#8cc63f"/>
<path d="M24 16 C32 16 36 11 36 6 C29 5 24 9 24 16 Z" fill="#a8db7a"/>
<path d="M11 24 H37 L34 42 C33.6 44 32 45 30 45 H18 C16 45 14.4 44 14 42 Z" fill="#e08a5b"/>
<path d="M9 22 H39 V27 H9 Z" fill="#f0a377"/>
</g><circle cx="20" cy="34" r="1.6" fill="${INK}"/><circle cx="28" cy="34" r="1.6" fill="${INK}"/>
<path d="M21.5 38 Q24 40.5 26.5 38" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></svg>`
let sproutImg: HTMLImageElement | null = null
function sproutImage(): HTMLImageElement {
  if (!sproutImg) {
    sproutImg = new Image()
    sproutImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(SPROUT_SVG)}`
  }
  return sproutImg
}

export class MarchGame {
  phase: MarchSnapshot['phase'] = 'ready'
  count = 1
  peak = 1
  score = 0
  best = loadBest()
  win = false
  isNewBest = false
  /** クリアしたとき、ボスが目の前に来るまで残っていた割合（0に近いほどギリギリ） */
  bossLeftAtEnd = -1
  elapsed = 0
  leaderX = ROAD_MID
  gates: Gate[] = []
  hordes: Horde[] = []
  boss: Boss | null = null
  private drops: Drop[] = []
  private floats: Float[] = []
  private events: Ev[] = []
  private evIndex = 0
  private shotTimer = 0
  private scroll = 0
  private shake = 0
  private targetX: number | null = null
  private keys = { left: false, right: false }
  private raf = 0
  private lastTs = 0
  private lastSnap = ''
  private ctx: CanvasRenderingContext2D
  private onSnapshot: (s: MarchSnapshot) => void

  constructor(canvas: HTMLCanvasElement, onSnapshot: (s: MarchSnapshot) => void) {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    canvas.width = MW * dpr
    canvas.height = MH * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas が使えません')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx = ctx
    this.onSnapshot = onSnapshot
    this.emit()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() { cancelAnimationFrame(this.raf) }

  start() {
    this.phase = 'playing'
    this.count = 1
    this.peak = 1
    this.score = 0
    this.win = false
    this.isNewBest = false
    this.bossLeftAtEnd = -1
    this.elapsed = 0
    this.leaderX = ROAD_MID
    this.targetX = null
    this.gates = []
    this.hordes = []
    this.boss = null
    this.drops = []
    this.floats = []
    this.events = this.makeEvents()
    this.evIndex = 0
    this.emit()
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused'
    else if (this.phase === 'paused') { this.phase = 'playing'; this.lastTs = 0 }
    this.emit()
  }

  pointTo(x: number) { this.targetX = x }
  setKey(dir: 'left' | 'right', down: boolean) { this.keys[dir] = down; if (down) this.targetX = null }

  // ---- 進行の台本：ゲートと虫の群れが交互に来て、最後にボス ----
  private makeEvents(): Ev[] {
    const ev: Ev[] = []
    for (let t = 1; t < MARCH_SECONDS - 2; t += 3.4) {
      ev.push({ t, kind: 'gate' })
      if (t > 3) ev.push({ t: t + 1.7, kind: 'horde' })
    }
    ev.push({ t: MARCH_SECONDS, kind: 'boss' })
    return ev
  }

  /** ゲートの組み合わせ。×を多めに、ときどき÷や−で緊張感を出す */
  private makeGate(t: number): Gate {
    const op = (kind: GateOp['kind'], value: number): GateOp => ({ kind, value, base: value, hits: 0 })
    const plus = () => op('add', randInt(4, 10) + Math.floor(t / 4))
    const minus = () => op('add', -(randInt(5, 12) + Math.floor(t / 3)))
    const r = Math.random()
    let ops: [GateOp, GateOp]
    if (t < 2) ops = [op('add', 5), op('mul', 2)] // 最初は必ず増える
    else if (r < 0.25) ops = [op('mul', 2), op('mul', 3)]
    else if (r < 0.45) ops = [op('mul', 2), plus()]
    else if (r < 0.58) ops = [op('mul', 3), op('div', 2)]
    else if (r < 0.7) ops = [op('mul', 2), minus()]
    else if (r < 0.76) ops = [op('mul', 5), op('div', 3)] // 大当たりとハズレ
    else if (r < 0.9) ops = [plus(), minus()]
    else ops = [op('div', 2), minus()] // どちらも減る：撃って被害を小さく
    if (Math.random() < 0.5) ops.reverse()
    return { y: -30, ops, used: false }
  }

  /** 虫の群れ。大きさは「いまの仲間の数」に合わせ、撃ちながらぶつかると少し減るくらいにする */
  private spawnHorde() {
    const n = Math.max(6, Math.round(this.count * rand(HORDE_MIN, HORDE_MAX)))
    const x = rand(ROAD_L + HORDE_W / 2, ROAD_R - HORDE_W / 2)
    this.hordes.push({ x, y: -60, n, max: n, hit: 0, thrown: false, vx: 0 })
  }

  private get squadRadius() { return 7.5 * Math.sqrt(Math.min(this.count, MAX_DRAWN)) + 12 }

  private memberPos(i: number): [number, number] {
    const a = i * 2.39996
    const r = 7.5 * Math.sqrt(i)
    return [this.leaderX + Math.cos(a) * r, SQUAD_Y + Math.sin(a) * r * 0.75]
  }

  private addFloat(text: string, x: number, y: number, color: string, big = false) {
    this.floats.push({ text, x, y, color, t: 0, big })
  }

  private setCount(next: number, x: number, label?: string) {
    next = Math.max(0, Math.round(next))
    const diff = next - this.count
    this.count = next
    if (this.count > this.peak) this.peak = this.count
    if (diff !== 0) {
      const big = Math.abs(diff) >= 50
      this.addFloat(label ?? (diff > 0 ? `+${fmt(diff)}` : `−${fmt(-diff)}`), x, SQUAD_Y - this.squadRadius - 40, diff > 0 ? '#2f7fc1' : '#d9603a', big)
    }
    if (diff < 0) this.shake = Math.min(0.35, 0.12 + Math.abs(diff) / Math.max(1, this.count + Math.abs(diff)))
    if (this.count <= 0) this.finish(false)
  }

  private finish(win: boolean) {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.win = win
    if (win) this.score += 1000 + this.count * 10
    this.score = Math.round(this.score)
    if (this.score > this.best) {
      this.best = this.score
      this.isNewBest = true
      try { localStorage.setItem(BEST_KEY, String(this.best)) } catch { /* 保存できなくても遊べる */ }
    }
    this.emit()
  }

  update(dt: number) {
    if (this.phase !== 'playing') return
    this.elapsed += dt
    this.scroll += WORLD_SPEED * dt
    this.shake = Math.max(0, this.shake - dt)

    // かじ取り
    if (this.keys.left || this.keys.right) {
      this.leaderX += (this.keys.right ? 1 : -1) * KEY_SPEED * dt
    } else if (this.targetX !== null) {
      this.leaderX += (this.targetX - this.leaderX) * Math.min(1, dt * 14)
    }
    this.leaderX = Math.max(ROAD_L + 18, Math.min(ROAD_R - 18, this.leaderX))

    // 台本どおりに出す
    while (this.evIndex < this.events.length && this.elapsed >= this.events[this.evIndex].t) {
      const e = this.events[this.evIndex++]
      if (e.kind === 'gate') this.gates.push(this.makeGate(e.t))
      else if (e.kind === 'horde') this.spawnHorde()
      else {
        // ボスの体力：投げてくる虫を全部よけて撃ち続けると、目の前に来る少し前に倒せる量
        const hp = firePower(this.count) * BOSS_WALK * BOSS_MARGIN
        this.boss = { y: -110, hp, maxHp: hp, hit: 0, throwTimer: 1.4, bornAt: this.elapsed }
      }
    }

    // 撃つ：ダメージは火力で計算し、水の粒は見た目
    const dmg = firePower(this.count) * dt
    this.shotTimer -= dt
    if (this.shotTimer <= 0) {
      this.shotTimer = 1 / SHOTS_PER_SEC
      const [x, y] = this.memberPos(Math.floor(Math.random() * Math.min(this.count, MAX_DRAWN)))
      this.drops.push({ x, y: y - 14 })
    }
    this.applyFire(dmg)

    // ゲート
    for (const g of this.gates) {
      g.y += WORLD_SPEED * dt
      if (!g.used && g.y >= SQUAD_Y - 6) {
        g.used = true
        const o = g.ops[this.leaderX < ROAD_MID ? 0 : 1]
        const next = o.kind === 'mul' ? this.count * o.value : o.kind === 'div' ? this.count / o.value : this.count + o.value
        const label = o.kind === 'mul' ? `×${o.value}！` : o.kind === 'div' ? `÷${o.value}…` : undefined
        this.setCount(next, this.leaderX, label)
        if (this.phase !== 'playing') return
      }
    }
    this.gates = this.gates.filter((g) => g.y < MH + 40)

    // 水の粒（見た目だけ）
    for (const d of this.drops) d.y -= 760 * dt
    this.drops = this.drops.filter((d) => d.y > -10)

    // 虫の群れ
    const keep: Horde[] = []
    for (const h of this.hordes) {
      h.hit = Math.max(0, h.hit - dt)
      h.y += (h.thrown ? 330 : WORLD_SPEED + 50) * dt
      h.x += h.vx * dt
      if (h.n <= 0) {
        this.score += Math.round(h.max) * 2
        this.addFloat('全滅！', h.x, h.y, '#4f7a2e')
        continue
      }
      // ぶつかったら、群れの数だけ仲間が減る（群れは消える）
      const reach = this.squadRadius + 18
      if (Math.abs(h.y - SQUAD_Y) < reach && Math.abs(h.x - this.leaderX) < HORDE_W / 2 * this.hordeScale(h) + reach * 0.6) {
        this.score += Math.round(Math.min(h.n, this.count)) * 2
        this.setCount(this.count - h.n, this.leaderX)
        if (this.phase !== 'playing') return
        continue
      }
      if (h.y > MH + 80) continue
      keep.push(h)
    }
    this.hordes = keep

    // ボス：ゆっくり近づき、ときどき虫の群れを投げてくる。目の前まで来たら負け
    const b = this.boss
    if (b) {
      b.hit = Math.max(0, b.hit - dt)
      const walk = (SQUAD_Y - this.squadRadius - 70 - -110) / BOSS_WALK
      b.y += walk * dt
      b.throwTimer -= dt
      if (b.throwTimer <= 0 && b.y < SQUAD_Y - 260) {
        b.throwTimer = BOSS_THROW_EVERY
        const n = Math.max(3, Math.round(this.count * BOSS_THROW_RATE))
        // 投げた瞬間の仲間の位置をねらう（動けばよけられる）
        this.hordes.push({ x: Math.max(ROAD_L + 50, Math.min(ROAD_R - 50, this.leaderX)), y: b.y + 60, n, max: n, hit: 0, thrown: true, vx: 0 })
      }
      if (b.hp <= 0) {
        this.addFloat('やったね！', ROAD_MID, b.y, '#4f7a2e', true)
        this.bossLeftAtEnd = Math.max(0, 1 - (this.elapsed - b.bornAt) / BOSS_WALK)
        this.boss = null
        this.finish(true)
        return
      }
      if (b.y >= SQUAD_Y - this.squadRadius - 70) {
        this.setCount(0, this.leaderX)
        return
      }
    }

    for (const f of this.floats) { f.t += dt; f.y -= 40 * dt }
    this.floats = this.floats.filter((f) => f.t < 1)
    this.emit()
  }

  /** 撃った分のダメージを、前にいる敵（ボス→手前の群れ→ゲート）に配る */
  private applyFire(dmg: number) {
    if (this.boss) { this.boss.hp -= dmg; this.boss.hit = 0.06; return }
    // 仲間の前（横に重なっている）でいちばん近い群れ
    const front = this.hordes
      .filter((h) => h.y > -40 && h.y < SQUAD_Y && Math.abs(h.x - this.leaderX) < HORDE_W / 2 + 60)
      .sort((a, z) => z.y - a.y)[0]
    if (front) { front.n -= dmg; front.hit = 0.06; return }
    // 敵がいないときは、前のゲートの数字を上げる（足し算・引き算のゲートだけ）
    const g = this.gates.find((x) => !x.used && x.y > 0)
    if (g) {
      const o = g.ops[this.leaderX < ROAD_MID ? 0 : 1]
      if (o.kind === 'add' && o.value < o.base + 12) {
        o.hits += dmg
        while (o.hits >= 3 && o.value < o.base + 12) { o.hits -= 3; o.value += 1 }
      }
    }
  }

  private hordeScale(h: Horde) { return Math.min(1, 0.55 + Math.sqrt(h.max) / 30) }

  private emit() {
    const b = this.boss
    const s: MarchSnapshot = {
      phase: this.phase, count: this.count, peak: this.peak, score: this.score, best: this.best,
      progress: Math.min(1, Math.round((this.elapsed / MARCH_SECONDS) * 100) / 100),
      win: this.win,
      bossHp: b ? Math.max(0, Math.round((b.hp / b.maxHp) * 100) / 100) : -1,
      bossLeft: b ? Math.max(0, Math.round((1 - (this.elapsed - b.bornAt) / BOSS_WALK) * 100) / 100) : Math.round(this.bossLeftAtEnd * 100) / 100,
      isNewBest: this.isNewBest,
    }
    const key = JSON.stringify(s)
    if (key === this.lastSnap) return
    this.lastSnap = key
    this.onSnapshot(s)
  }

  private loop = (ts: number) => {
    const dt = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0
    this.lastTs = ts
    this.update(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  // ---- 描画 ----
  private draw() {
    const c = this.ctx
    c.save()
    if (this.shake > 0) c.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    // 草地と道
    c.fillStyle = '#cfe8a9'
    c.fillRect(-10, -10, MW + 20, MH + 20)
    c.fillStyle = '#f3e3c3'
    c.fillRect(ROAD_L, -10, ROAD_R - ROAD_L, MH + 20)
    c.strokeStyle = INK
    c.lineWidth = 2
    for (const x of [ROAD_L, ROAD_R]) { c.beginPath(); c.moveTo(x, -10); c.lineTo(x, MH + 10); c.stroke() }
    const off = this.scroll % 80
    c.strokeStyle = 'rgba(46,41,36,0.25)'
    c.lineWidth = 4
    for (let y = -80 + off; y < MH; y += 80) { c.beginPath(); c.moveTo(ROAD_MID, y); c.lineTo(ROAD_MID, y + 36); c.stroke() }
    c.strokeStyle = '#77b02c'
    c.lineWidth = 2.5
    for (let i = 0; i < 12; i++) {
      const y = ((i * 97 + this.scroll) % (MH + 40)) - 20
      const x = i % 2 ? 14 + ((i * 37) % 30) : ROAD_R + 14 + ((i * 53) % 30)
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y - 10); c.moveTo(x, y); c.lineTo(x + 4, y - 11); c.stroke()
    }

    c.textAlign = 'center'
    c.textBaseline = 'middle'

    // ゲート（×は黄色、＋は青、−と÷は赤）
    for (const g of this.gates) {
      g.ops.forEach((o, i) => {
        const x0 = i === 0 ? ROAD_L + 6 : ROAD_MID + 3
        const w = (ROAD_R - ROAD_L) / 2 - 9
        const fill = o.kind === 'mul' ? 'rgba(246,196,69,0.9)' : o.kind === 'div' || o.value < 0 ? 'rgba(244,137,95,0.85)' : 'rgba(90,169,230,0.8)'
        c.globalAlpha = g.used ? 0.3 : 1
        c.fillStyle = fill
        c.strokeStyle = INK
        c.lineWidth = 2.5
        c.beginPath(); c.roundRect(x0, g.y - 30, w, 60, 12); c.fill(); c.stroke()
        c.fillStyle = INK
        c.font = `900 ${o.kind === 'mul' ? 38 : 30}px 'Zen Maru Gothic', sans-serif`
        const label = o.kind === 'mul' ? `×${o.value}` : o.kind === 'div' ? `÷${o.value}` : o.value >= 0 ? `+${o.value}` : `−${-o.value}`
        c.fillText(label, x0 + w / 2, g.y + 2)
        c.globalAlpha = 1
      })
    }

    // 虫の群れ（数に応じて描く虫を増やす）と数の札
    const bugImg = spriteImage('bug')
    for (const h of [...this.hordes].sort((a, z) => a.y - z.y)) {
      const sc = this.hordeScale(h)
      const shown = Math.min(36, Math.max(3, Math.ceil(h.n / Math.max(1, h.max / 36))))
      c.globalAlpha = h.hit > 0 ? 0.75 : 1
      for (let i = 0; i < shown; i++) {
        const a = i * 2.39996
        const r = Math.sqrt(i / 36) * HORDE_W * 0.48 * sc
        const x = h.x + Math.cos(a) * r
        const y = h.y + Math.sin(a) * r * 0.45 + Math.sin(this.scroll / 9 + i) * 1.5
        if (bugImg.complete) c.drawImage(bugImg, x - 15, y - 15, 30, 30)
      }
      c.globalAlpha = 1
      this.drawTag(fmt(h.n), h.x, h.y - HORDE_W * 0.26 * sc - 18, '#f4895f')
    }

    // ボス
    const b = this.boss
    if (b) {
      const size = 190
      c.save()
      c.translate(ROAD_MID, b.y)
      if (b.hit > 0) c.globalAlpha = 0.85
      if (bugImg.complete) c.drawImage(bugImg, -size / 2, -size / 2, size, size)
      c.restore()
      this.drawTag(`ボス ${fmt(Math.max(0, b.hp))}`, ROAD_MID, b.y - size / 2 - 6, '#f4895f')
    }

    // 水の粒
    c.fillStyle = '#3f98dc'
    c.strokeStyle = INK
    c.lineWidth = 1.5
    for (const d of this.drops) { c.beginPath(); c.ellipse(d.x, d.y, 3.5, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke() }

    // 仲間の芽
    if (this.count > 0) {
      const img = sproutImage()
      const drawn = Math.min(this.count, MAX_DRAWN)
      const pos: [number, number][] = []
      for (let i = 0; i < drawn; i++) pos.push(this.memberPos(i))
      pos.sort((a, z) => a[1] - z[1])
      const bob = Math.sin(this.scroll / 14) * 1.5
      for (let i = 0; i < pos.length; i++) {
        const [x, y] = pos[i]
        if (img.complete) c.drawImage(img, x - 14, y - 16 + (i % 2 ? bob : -bob), 28, 28)
      }
      this.drawTag(fmt(this.count), this.leaderX, SQUAD_Y - this.squadRadius - 24, '#f6c445', 22)
    }

    // 浮かぶ文字
    for (const f of this.floats) {
      c.font = `900 ${f.big ? 40 : 26}px 'Zen Maru Gothic', sans-serif`
      const scale = f.big ? 1 + Math.max(0, 0.25 - f.t) * 1.6 : 1
      c.save()
      c.translate(f.x, f.y)
      c.scale(scale, scale)
      c.globalAlpha = Math.max(0, 1 - f.t)
      c.lineWidth = 5
      c.strokeStyle = '#fffdf7'
      c.strokeText(f.text, 0, 0)
      c.fillStyle = f.color
      c.fillText(f.text, 0, 0)
      c.restore()
    }
    c.restore()
  }

  private drawTag(label: string, x: number, y: number, fill: string, size = 18) {
    const c = this.ctx
    c.font = `900 ${size}px 'Zen Maru Gothic', sans-serif`
    const tw = Math.max(40, c.measureText(label).width + 22)
    const h = size + 10
    c.fillStyle = fill
    c.strokeStyle = INK
    c.lineWidth = 2
    c.beginPath(); c.roundRect(x - tw / 2, y - h / 2, tw, h, h / 2); c.fill(); c.stroke()
    c.fillStyle = INK
    c.fillText(label, x, y + 1)
  }
}
