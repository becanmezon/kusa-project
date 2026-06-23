import type { Watering, Shift, Vegetable } from '../types'
import { today, tomorrow } from './utils'

const t   = today()
const tom = tomorrow()

export const mockWaterings: Watering[] = [
  {
    id: '1', date: t, status: 'watered',
    by_name: '沼田', note: 'トマトに多めにあげた',
    created_at: new Date().toISOString(),
  },
]

export const mockShifts: Shift[] = [
  { id: '1', date: t,   morning_names: ['沼田', '中田'], evening_names: ['香川'], created_at: new Date().toISOString() },
  { id: '2', date: tom, morning_names: ['今川'],          evening_names: ['前澤', '迫田'], created_at: new Date().toISOString() },
]

export const mockVegetables: Vegetable[] = [
  { id: '1', name: 'ミニトマト', by_name: '沼田', note: '赤くなってきた！', image_path: '', day: t, created_at: new Date().toISOString() },
  { id: '2', name: 'きゅうり',   by_name: '中田', note: 'すくすく成長中',   image_path: '', day: t, created_at: new Date().toISOString() },
]
