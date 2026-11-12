// 月末まとめ：1か月分の水やり・シフト・Wの投稿から数字を集計する
import type { Watering, Shift, Post, Reaction, Reply, Vegetable } from '../types'
import { getSlotsForDate, type Slot } from './wateringRule'

export interface RankEntry { name: string; count: number }

export interface PopularPost {
  post: Post
  reactionCount: number
  replyCount: number
  score: number
}

export interface MonthlySummary {
  month: string              // "YYYY-MM"
  label: string              // "10月"
  fromDate: string
  toDate: string             // 集計の最終日（今月なら今日まで）
  isPartial: boolean         // 月の途中までの集計か
  required: number           // 水やりが必要だった枠の数
  done: number               // 記録があった枠（水やり＋雨）
  watered: number
  rain: number
  missed: number
  rate: number               // 0〜100
  ranking: RankEntry[]       // 記録した回数ランキング
  postCount: number
  reactionTotal: number
  replyTotal: number
  popular: PopularPost[]     // リアクション＋返信が多い順
  posters: RankEntry[]       // 投稿数ランキング
  vegetableCount: number     // 野菜ギャラリーに追加された写真
  dualSlotFrom: string | null // この月で朝夜2枠になった最初の日
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM" の1日〜末日 */
export function monthRange(month: string): { from: string; to: string; days: string[] } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const days = Array.from({ length: last }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)
  return { from: days[0], to: days[days.length - 1], days }
}

export function shiftMonth(month: string, diff: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** ISO日時をローカル（日本時間）の "YYYY-MM-DD" に */
function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function splitNames(byName: string): string[] {
  return byName.split('・').map((s) => s.trim()).filter(Boolean)
}

function rank(counter: Map<string, number>): RankEntry[] {
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'))
}

export function buildMonthlySummary(params: {
  month: string
  today: string
  waterings: Watering[]
  shifts: Shift[]
  posts: Post[]
  reactions: Reaction[]
  replies: Reply[]
  vegetables: Vegetable[]
}): MonthlySummary {
  const { month, today, waterings, shifts, posts, reactions, replies, vegetables } = params
  const { from, to, days } = monthRange(month)
  const lastDay = today < to ? today : to
  const isPartial = today < to
  const targetDays = days.filter((d) => d <= lastDay)

  const shiftByDate = new Map(shifts.map((s) => [s.date, s]))
  const recordKey = (date: string, slot: Slot) => `${date}:${slot}`
  const records = new Map<string, Watering>()
  for (const w of waterings) {
    if (w.date >= from && w.date <= lastDay) records.set(recordKey(w.date, w.slot), w)
  }

  // 水やりが必要だった枠：その日のルール上の枠のうち、担当者がいる枠（休みの日は数えない）
  // 担当者がいなくても誰かが記録していれば数える
  let required = 0
  let done = 0
  let watered = 0
  let rain = 0
  let dualSlotFrom: string | null = null
  for (const date of targetDays) {
    const slots = getSlotsForDate(date)
    if (slots.length > 1 && !dualSlotFrom) dualSlotFrom = date
    const shift = shiftByDate.get(date)
    for (const slot of slots) {
      const names = slot === 'morning' ? shift?.morning_names : shift?.evening_names
      const rec = records.get(recordKey(date, slot))
      const hasDuty = (names?.length ?? 0) > 0
      if (!hasDuty && !rec) continue
      required += 1
      if (rec) {
        done += 1
        if (rec.status === 'rain') rain += 1
        else watered += 1
      }
    }
  }

  // 記録した回数（2人で記録したらそれぞれ1回）
  const recCounter = new Map<string, number>()
  for (const w of records.values()) {
    for (const n of splitNames(w.by_name)) recCounter.set(n, (recCounter.get(n) ?? 0) + 1)
  }

  // Wの投稿
  const monthPosts = posts.filter((p) => {
    const d = localDate(p.created_at)
    return d >= from && d <= to
  })
  const ids = new Set(monthPosts.map((p) => p.id))
  const reactionCount = new Map<string, number>()
  const replyCount = new Map<string, number>()
  for (const r of reactions) if (ids.has(r.post_id)) reactionCount.set(r.post_id, (reactionCount.get(r.post_id) ?? 0) + 1)
  for (const r of replies) if (ids.has(r.post_id)) replyCount.set(r.post_id, (replyCount.get(r.post_id) ?? 0) + 1)
  const popular = monthPosts
    .map((post) => {
      const rc = reactionCount.get(post.id) ?? 0
      const pc = replyCount.get(post.id) ?? 0
      return { post, reactionCount: rc, replyCount: pc, score: rc + pc * 2 }
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || b.post.created_at.localeCompare(a.post.created_at))
    .slice(0, 3)
  const posterCounter = new Map<string, number>()
  for (const p of monthPosts) posterCounter.set(p.by_name, (posterCounter.get(p.by_name) ?? 0) + 1)

  const vegetableCount = vegetables.filter((v) => {
    const d = v.day || localDate(v.created_at)
    return d >= from && d <= to
  }).length

  return {
    month,
    label: `${Number(month.slice(5, 7))}月`,
    fromDate: from,
    toDate: lastDay,
    isPartial,
    required,
    done,
    watered,
    rain,
    missed: required - done,
    rate: required === 0 ? 0 : Math.round((done / required) * 100),
    ranking: rank(recCounter),
    postCount: monthPosts.length,
    reactionTotal: [...reactionCount.values()].reduce((a, b) => a + b, 0),
    replyTotal: [...replyCount.values()].reduce((a, b) => a + b, 0),
    popular,
    posters: rank(posterCounter),
    vegetableCount,
    dualSlotFrom,
  }
}

/** 多い順に並んだ回数から順位（0始まり）を出す。同じ回数は同じ順位 */
export function rankPlaces(counts: number[]): number[] {
  return counts.map((c) => counts.indexOf(c))
}

function excerpt(body: string, max = 24): string {
  const one = body.replace(/\s+/g, ' ').trim()
  if (!one) return '（写真の投稿）'
  return one.length > max ? one.slice(0, max) + '…' : one
}

/** W に投稿する文章を作る */
export function buildSummaryPostText(s: MonthlySummary): string {
  const medals = ['🥇', '🥈', '🥉']
  const lines: string[] = []
  lines.push(`🌱 ${s.label}の草プロまとめ 🌱${s.isPartial ? '（途中経過）' : ''}`)
  lines.push('')
  lines.push(`💧 水やり達成率 ${s.rate}%（${s.done}/${s.required}回）`)
  lines.push(`\u3000水やり ${s.watered}回 ／ 雨 ${s.rain}回 ／ 未記録 ${s.missed}回`)
  if (s.ranking.length > 0) {
    lines.push('')
    lines.push('🏆 水やり記録ランキング')
    const top = s.ranking.slice(0, 5)
    const places = rankPlaces(top.map((r) => r.count))
    top.forEach((r, i) => {
      const place = places[i]
      lines.push(`${medals[place] ?? `${place + 1}位`} ${r.name}さん ${r.count}回`)
    })
  }
  lines.push('')
  lines.push(`📣 Wの投稿 ${s.postCount}件（リアクション ${s.reactionTotal}・返信 ${s.replyTotal}）`)
  if (s.popular[0]) {
    const p = s.popular[0]
    lines.push(`\u3000いちばん人気：${p.post.by_name}さん「${excerpt(p.post.body)}」`)
  }
  if (s.vegetableCount > 0) {
    lines.push(`📸 野菜の写真 ${s.vegetableCount}枚`)
  }
  lines.push('')
  lines.push(`${s.label}もありがとうございました！来月もよろしくお願いします🙌`)
  return lines.join('\n')
}
