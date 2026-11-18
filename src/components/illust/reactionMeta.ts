// W のリアクション。保存される値は従来どおりの文字列キーで、表示は手描きアイコン（Illust.tsx）
export const REACTION_LABELS: Record<string, string> = {
  '❤️': 'すき',
  '👍': 'いいね',
  '🌱': 'すくすく',
  '🎉': 'おめでとう',
  '🫡': 'りょうかい',
  '😭': 'かなしい',
  '🦀': 'カニ',
}

/** リアクション候補（この順で並ぶ） */
export const REACTION_KEYS = Object.keys(REACTION_LABELS)

export function reactionLabel(key: string): string {
  return REACTION_LABELS[key] ?? key
}
