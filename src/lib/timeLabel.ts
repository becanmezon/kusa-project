/** 投稿日時を「たった今／◯分前／◯時間前／M/D HH:MM」で表す */
export function timeLabel(isoStr: string): string {
  const d = new Date(isoStr)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1)  return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}時間前`
  const m = d.getMonth() + 1
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${d.getDate()} ${hh}:${mm}`
}
