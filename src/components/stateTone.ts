import type { SceneState } from './illust/Illust'

/** 状態ごとの色（カード下半分の地色・バッジ・バッジの文言）。今日の画面と展示モードで共通 */
export const STATE_TONE: Record<SceneState, { bg: string; badge: string; label: string }> = {
  done: { bg: '#E0F2CC', badge: '#A8DB7A', label: '済み' },
  todo: { bg: '#FFE1CC', badge: '#F4895F', label: 'まだ' },
  rain: { bg: '#DCEEFA', badge: '#5AA9E6', label: '雨' },
}
