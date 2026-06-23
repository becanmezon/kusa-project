import type { Watering, Shift, Vegetable } from '../types'
import { today, tomorrow } from './utils'

const t = today()
const tom = tomorrow()

export const mockWaterings: Watering[] = [
  { id: '1', date: t, by_name: 'たろう', note: 'トマトに多めにあげた', created_at: new Date().toISOString() },
]

export const mockShifts: Shift[] = [
  { id: '1', date: t,   names: ['たろう', 'はなこ'], created_at: new Date().toISOString() },
  { id: '2', date: tom, names: ['けんじ'],            created_at: new Date().toISOString() },
  // 過去数日分
  ...Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i - 1)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return {
      id: `past-${i}`,
      date: ds,
      names: [['たろう','はなこ','けんじ'][i % 3]],
      created_at: d.toISOString(),
    }
  }),
]

export const mockVegetables: Vegetable[] = [
  {
    id: '1',
    name: 'ミニトマト',
    by_name: 'はなこ',
    note: '赤くなってきた！',
    image_path: '',
    day: t,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'きゅうり',
    by_name: 'たろう',
    note: 'すくすく成長中',
    image_path: '',
    day: t,
    created_at: new Date().toISOString(),
  },
]

// 過去2週間分の水やり履歴（モック）
export function mockWateringHistory(): { date: string; watering: Watering | null }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const done = i % 3 !== 0  // 3の倍数日は未対応にする
    return {
      date: ds,
      watering: done
        ? { id: `h-${i}`, date: ds, by_name: ['たろう','はなこ','けんじ'][i%3], note: null, created_at: d.toISOString() }
        : null,
    }
  })
}
