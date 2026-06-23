// ─── テスト用日付オーバーライド ──────────────────────────────
// ?testdate=YYYY-MM-DD をURLに付けると「今日」をその日付として扱う。
// 確認が終わったら getEffectiveDate() を削除し、today()/tomorrow()/getActiveSlots() を
// new Date() 直接呼び出しに戻すだけで完全に除去できる。

function getEffectiveDate(): Date {
  const param = new URLSearchParams(window.location.search).get('testdate')
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const d = new Date(param + 'T00:00:00')
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

/** テストモードが有効かどうか（バナー表示などに使う） */
export function isTestMode(): boolean {
  return !!new URLSearchParams(window.location.search).get('testdate')
}

/** 今日の日付を "YYYY-MM-DD" 形式で返す（?testdate で上書き可） */
export function today(): string {
  const d = getEffectiveDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 明日の日付を "YYYY-MM-DD" 形式で返す（?testdate で上書き可） */
export function tomorrow(): string {
  const d = getEffectiveDate()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "YYYY-MM-DD" → "M月D日(曜)" 形式に変換 */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${m}月${d}日(${days[date.getDay()]})`
}

/** "HH:MM" 形式の時刻文字列を返す */
export function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * 今日の月に基づいて表示すべき担当枠を返す
 * - 7〜9月: 朝・夜の両方
 * - それ以外（6月など）: 朝のみ
 * 「今日の日付」を基準にする仕様
 */
export function getActiveSlots(): ('morning' | 'evening')[] {
  const month = getEffectiveDate().getMonth() + 1 // ?testdate で上書き可
  return month >= 7 && month <= 9 ? ['morning', 'evening'] : ['morning']
}

/** localStorage から名前を取得 */
export function getSavedName(): string {
  return localStorage.getItem('kusa_user_name') ?? ''
}

/** localStorage に名前を保存 */
export function saveName(name: string): void {
  localStorage.setItem('kusa_user_name', name)
}

/**
 * 画像をクライアント側でリサイズ・圧縮する
 * @param file   元の画像ファイル
 * @param maxPx  長辺の最大ピクセル数（デフォルト900）
 * @param quality JPEG品質 0〜1（デフォルト0.8）
 */
export function resizeImage(file: File, maxPx = 900, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('canvas toBlob failed'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = reject
    img.src = url
  })
}
