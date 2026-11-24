// めばえ大行進（試作）：ゲートをくぐって芽の仲間を増やし、水てっぽうで虫を追い払いながら進むゲーム。
// 描画はすべて canvas。絵は草プロジェクトの配色（インクの線＋パステルのベタ塗り）で描く。
import { spriteImage } from './catchSprites'

export const MW = 480
export const MH = 800
/** ボスが出てくるまでの時間（秒） */
export const MARCH_SECONDS = 56

const INK = '#2e2924'
const ROAD_L = 60
const ROAD_R = 420
const ROAD_MID = (ROAD_L + ROAD_R) / 2
const SQUAD_Y = 660
const WORLD_SPEED = 170 // 道が流れる速さ（px/秒）
const KEY_SPEED = 520
const MAX_DRAWN = 80 // 画面に描く仲間の上限（数はそれ以上に増える）
const VOLLEY = 0.25 // 水を撃つ間隔（秒）
const MAX_SHOTS = 12 // 1回に撃つ水の粒の上限（仲間が多いときは1粒が強くなる）
const GATE_SHOOT_MAX = 6 // 撃って上げられるのは元の数字＋6まで
const GATE_SHOOT_HITS = 8 // 水が8粒当たるごとに＋1
const BOSS_HP = 2000
const BEST_KEY = 'kusa_march_best'

type GateOp = { kind: 'add'; value: number; base: number; hits: number } | { kind: 'mul'; value: number }
interface Gate { y: number; ops: [GateOp, GateOp]; used: boolean }
interface Bug { x: number; y: number; hp: number; maxHp: number; size: number; cost: number; boss: boolean; hit: number; wob: number }
interface Drop { x: number; y: number; dmg: number }
interface Float { x: number; y: number; text: string; color: string; t: number }
type Ev = { t: number; kind: 'gate' } | { t: number; kind: 'wave'; n: number } | { t: number; kind: 'boss' }

export interface MarchSnapshot {
  phase: 'ready' | 'playing' | 'paused' | 'over'
  count: number
  score: number
  best: number
  progress: number // 0〜1（ボスまでの進み具合）
  win: boolean
  bossHp: number // 0〜1。ボスがいないときは -1
  isNewBest: boolean
}

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))

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
  score = 0
  best = loadBest()
  win = false
  isNewBest = false
  elapsed = 0
  leaderX = ROAD_MID
  gates: Gate[] = []
  bugs: Bug[] = []
  private drops: Drop[] = []
  private floats: Float[] = []
  private events: Ev[] = []
  private evIndex = 0
  private volleyTimer = 0
  private bossSpawnTimer = 0
  private scroll = 0
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
    this.score = 0
    this.win = false
    this.isNewBest = false
    this.elapsed = 0
    this.leaderX = ROAD_MID
    this.targetX = null
    this.gates = []
    this.bugs = []
    this.drops = []
    this.floats = []
    this.volleyTimer = 0
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

  // ---- 進行の台本（毎回ランダム）----
  private makeEvents(): Ev[] {
    const ev: Ev[] = []
    for (let t = 1.2; t < MARCH_SECONDS - 4; t += 4.6) {
      ev.push({ t, kind: 'gate' })
      ev.push({ t: t + 2.3, kind: 'wave', n: Math.round((t - 1.2) / 4.6) })
    }
    ev.push({ t: MARCH_SECONDS, kind: 'boss' })
    return ev
  }

  private makeGate(t: number): Gate {
    const add = (v: number): GateOp => ({ kind: 'add', value: v, base: v, hits: 0 })
    const good = () => randInt(2, 5) + Math.floor(t / 9)
    const bad = () => -(randInt(2, 5) + Math.floor(t / 8))
    let ops: [GateOp, GateOp]
    const r = Math.random()
    if (t < 2) ops = [add(3), add(5)] // 最初は必ず増える
    else if (r < 0.5) ops = [add(good()), add(bad())]
    else if (r < 0.72) ops = [add(good()), add(good() + randInt(1, 4))]
    else if (r < 0.8 && t > 20) ops = [{ kind: 'mul', value: 2 }, add(good() + 6)]
    else ops = [add(bad()), add(bad() - 2)] // どちらもマイナス：撃って数字を上げよう
    if (Math.random() < 0.5) ops.reverse()
    return { y: -30, ops, used: false }
  }

  private spawnWave(n: number, t: number) {
    const num = 3 + Math.round(t * 0.3)
    const hp = 2 + t * 0.55
    for (let i = 0; i < num; i++) {
      this.bugs.push({ x: rand(ROAD_L + 24, ROAD_R - 24), y: -30 - rand(0, 260), hp, maxHp: hp, size: 40, cost: 1, boss: false, hit: 0, wob: rand(0, 6) })
    }
    if (n % 3 === 2) {
      const bh = hp * 9
      this.bugs.push({ x: rand(ROAD_L + 60, ROAD_R - 60), y: -120, hp: bh, maxHp: bh, size: 76, cost: 5, boss: false, hit: 0, wob: 0 })
    }
  }

  private get squadRadius() { return 9 * Math.sqrt(Math.min(this.count, MAX_DRAWN)) + 12 }

  private memberPos(i: number): [number, number] {
    const a = i * 2.39996
    const r = 9 * Math.sqrt(i)
    return [this.leaderX + Math.cos(a) * r, SQUAD_Y + Math.sin(a) * r * 0.8]
  }

  private addFloat(text: string, x: number, y: number, color: string) {
    this.floats.push({ text, x, y, color, t: 0 })
  }

  private changeCount(next: number, x: number) {
    const diff = next - this.count
    this.count = Math.max(0, next)
    if (diff !== 0) this.addFloat(diff > 0 ? `+${diff}` : `${diff}`, x, SQUAD_Y - this.squadRadius - 34, diff > 0 ? '#3f98dc' : '#d9603a')
    if (this.count <= 0) this.finish(false)
  }

  private finish(win: boolean) {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.win = win
    if (win) this.score += 1000 + this.count * 50
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

    // かじ取り
    const margin = 16
    if (this.keys.left || this.keys.right) {
      this.leaderX += (this.keys.right ? 1 : -1) * KEY_SPEED * dt
    } else if (this.targetX !== null) {
      this.leaderX += (this.targetX - this.leaderX) * Math.min(1, dt * 14)
    }
    this.leaderX = Math.max(ROAD_L + margin, Math.min(ROAD_R - margin, this.leaderX))

    // 台本どおりに出す
    while (this.evIndex < this.events.length && this.elapsed >= this.events[this.evIndex].t) {
      const e = this.events[this.evIndex++]
      if (e.kind === 'gate') this.gates.push(this.makeGate(e.t))
      else if (e.kind === 'wave') this.spawnWave(e.n, e.t)
      else {
        const hp = BOSS_HP
        this.bugs.push({ x: ROAD_MID, y: -90, hp, maxHp: hp, size: 170, cost: 9999, boss: true, hit: 0, wob: 0 })
        this.bossSpawnTimer = 2
      }
    }

    // 水を撃つ
    this.volleyTimer -= dt
    if (this.volleyTimer <= 0) {
      this.volleyTimer = VOLLEY
      const shots = Math.min(this.count, MAX_SHOTS)
      const drawn = Math.min(this.count, MAX_DRAWN)
      const dmg = this.count / shots
      for (let s = 0; s < shots; s++) {
        const [x, y] = this.memberPos(Math.floor(Math.random() * drawn))
        this.drops.push({ x, y: y - 14, dmg })
      }
    }

    // ゲート
    for (const g of this.gates) {
      g.y += WORLD_SPEED * dt
      if (!g.used && g.y >= SQUAD_Y - 6) {
        g.used = true
        const op = g.ops[this.leaderX < ROAD_MID ? 0 : 1]
        const next = op.kind === 'mul' ? this.count * op.value : this.count + op.value
        this.changeCount(next, this.leaderX)
        if (this.phase !== 'playing') return
      }
    }
    this.gates = this.gates.filter((g) => g.y < MH + 40)

    // 水の粒
    const keepDrops: Drop[] = []
    for (const d of this.drops) {
      d.y -= 720 * dt
      if (d.y < -10) continue
      let gone = false
      // ゲートに当たると数字が上がる（足し算のゲートだけ）
      for (const g of this.gates) {
        if (g.used || Math.abs(d.y - g.y) > 18) continue
        const op = g.ops[d.x < ROAD_MID ? 0 : 1]
        if (op.kind === 'add' && op.value < op.base + GATE_SHOOT_MAX) {
          op.hits += 1
          if (op.hits >= GATE_SHOOT_HITS) { op.hits = 0; op.value += 1 }
        }
        gone = true
        break
      }
      if (!gone) {
        for (const b of this.bugs) {
          const r = b.size * 0.42
          if (Math.abs(d.x - b.x) < r && Math.abs(d.y - b.y) < r) {
            b.hp -= d.dmg
            b.hit = 0.08
            gone = true
            break
          }
        }
      }
      if (!gone) keepDrops.push(d)
    }
    this.drops = keepDrops

    // 虫
    const keepBugs: Bug[] = []
    for (const b of this.bugs) {
      b.hit = Math.max(0, b.hit - dt)
      if (b.hp <= 0) {
        this.score += b.boss ? 0 : b.cost * 10
        this.addFloat(b.boss ? 'やったね！' : `+${b.cost * 10}`, b.x, b.y, '#4f7a2e')
        if (b.boss) { this.finish(true); return }
        continue
      }
      if (b.boss) {
        b.y += (b.y < 150 ? 120 : 24) * dt
        this.bossSpawnTimer -= dt
        if (this.bossSpawnTimer <= 0) {
          this.bossSpawnTimer = 2.4
          for (let i = 0; i < 4; i++) this.bugs.push({ x: b.x + rand(-110, 110), y: b.y + 60, hp: 40, maxHp: 40, size: 40, cost: 1, boss: false, hit: 0, wob: rand(0, 6) })
        }
      } else {
        b.y += (WORLD_SPEED + 30) * dt
        b.wob += dt * 5
        // じわじわ仲間の方へ寄ってくる
        b.x += Math.sign(this.leaderX - b.x) * Math.min(Math.abs(this.leaderX - b.x), 34 * dt) + Math.sin(b.wob) * 20 * dt
      }
      // 仲間にぶつかる
      const reach = this.squadRadius + b.size * 0.36
      if (Math.abs(b.y - SQUAD_Y) < reach && Math.abs(b.x - this.leaderX) < reach) {
        this.changeCount(this.count - b.cost, this.leaderX)
        if (this.phase !== 'playing') return
        continue
      }
      if (b.y > MH + 60) continue
      keepBugs.push(b)
    }
    this.bugs = keepBugs

    for (const f of this.floats) { f.t += dt; f.y -= 40 * dt }
    this.floats = this.floats.filter((f) => f.t < 0.9)
    this.emit()
  }

  private emit() {
    const boss = this.bugs.find((b) => b.boss)
    const s: MarchSnapshot = {
      phase: this.phase, count: this.count, score: this.score, best: this.best,
      progress: Math.min(1, Math.round((this.elapsed / MARCH_SECONDS) * 100) / 100),
      win: this.win, bossHp: boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100) / 100) : -1,
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
    c.lineJoin = 'round'
    c.lineCap = 'round'
    // 草地と道
    c.fillStyle = '#cfe8a9'
    c.fillRect(0, 0, MW, MH)
    c.fillStyle = '#f3e3c3'
    c.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, MH)
    c.strokeStyle = INK
    c.lineWidth = 2
    for (const x of [ROAD_L, ROAD_R]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, MH); c.stroke() }
    // 道の真ん中の点線と、草地の草（流れて見える）
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

    // ゲート
    c.font = "900 30px 'Zen Maru Gothic', sans-serif"
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    for (const g of this.gates) {
      g.ops.forEach((op, i) => {
        const x0 = i === 0 ? ROAD_L + 6 : ROAD_MID + 3
        const w = (ROAD_R - ROAD_L) / 2 - 9
        const good = op.kind === 'mul' || op.value > 0
        c.globalAlpha = g.used ? 0.35 : 1
        c.fillStyle = good ? 'rgba(90,169,230,0.78)' : 'rgba(244,137,95,0.82)'
        c.strokeStyle = INK
        c.lineWidth = 2.5
        c.beginPath()
        c.roundRect(x0, g.y - 26, w, 52, 12)
        c.fill()
        c.stroke()
        c.fillStyle = INK
        const label = op.kind === 'mul' ? `×${op.value}` : op.value > 0 ? `+${op.value}` : op.value === 0 ? '0' : `−${-op.value}`
        c.fillText(label, x0 + w / 2, g.y + 2)
        c.globalAlpha = 1
      })
    }

    // 虫
    const bugImg = spriteImage('bug')
    for (const b of [...this.bugs].sort((a, z) => a.y - z.y)) {
      c.save()
      c.translate(b.x, b.y)
      if (b.hit > 0) c.globalAlpha = 0.6
      if (bugImg.complete) c.drawImage(bugImg, -b.size / 2, -b.size / 2, b.size, b.size)
      c.restore()
      if (b.hp < b.maxHp) {
        const w = b.size * 0.8
        c.fillStyle = '#fffdf7'
        c.strokeStyle = INK
        c.lineWidth = 1.5
        c.beginPath(); c.roundRect(b.x - w / 2, b.y - b.size / 2 - 9, w, 6, 3); c.fill(); c.stroke()
        c.fillStyle = '#f4895f'
        c.beginPath(); c.roundRect(b.x - w / 2, b.y - b.size / 2 - 9, w * Math.max(0, b.hp / b.maxHp), 6, 3); c.fill()
      }
    }

    // 水の粒
    c.fillStyle = '#3f98dc'
    c.strokeStyle = INK
    c.lineWidth = 1.5
    for (const d of this.drops) {
      c.beginPath(); c.ellipse(d.x, d.y, 3.5, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke()
    }

    // 仲間の芽（奥から手前の順に）
    if (this.count > 0) {
      const img = sproutImage()
      const drawn = Math.min(this.count, MAX_DRAWN)
      const pos: [number, number][] = []
      for (let i = 0; i < drawn; i++) pos.push(this.memberPos(i))
      pos.sort((a, z) => a[1] - z[1])
      const bob = Math.sin(this.scroll / 14) * 1.5
      for (let i = 0; i < pos.length; i++) {
        const [x, y] = pos[i]
        if (img.complete) c.drawImage(img, x - 15, y - 17 + (i % 2 ? bob : -bob), 30, 30)
      }
      // 人数の札
      const label = String(this.count)
      c.font = "900 20px 'Zen Maru Gothic', sans-serif"
      const tw = Math.max(40, c.measureText(label).width + 22)
      const ty = SQUAD_Y - this.squadRadius - 26
      c.fillStyle = '#f6c445'
      c.strokeStyle = INK
      c.lineWidth = 2
      c.beginPath(); c.roundRect(this.leaderX - tw / 2, ty - 14, tw, 28, 14); c.fill(); c.stroke()
      c.fillStyle = INK
      c.fillText(label, this.leaderX, ty + 1)
    }

    // 浮かぶ文字
    c.font = "900 24px 'Zen Maru Gothic', sans-serif"
    for (const f of this.floats) {
      c.globalAlpha = Math.max(0, 1 - f.t / 0.9)
      c.lineWidth = 4
      c.strokeStyle = '#fffdf7'
      c.strokeText(f.text, f.x, f.y)
      c.fillStyle = f.color
      c.fillText(f.text, f.x, f.y)
      c.globalAlpha = 1
    }
  }
}
