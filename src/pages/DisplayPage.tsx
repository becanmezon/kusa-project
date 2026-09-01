import { useCallback, useEffect, useState } from 'react'
import { Droplets, CheckCircle, CloudRain, Trash2 } from 'lucide-react'
import { fetchWaterings, fetchShifts, upsertWatering, deleteWateringByDateSlot } from '../lib/db'
import { formatDate, formatTime } from '../lib/utils'
import type { Watering, Shift } from '../types'

type Slot = 'morning' | 'evening'

const REFRESH_MS = 30_000
const NO_SHIFT_NAME = '別館分室'

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 0:00〜15:00 → 朝、15:00〜23:59 → 夜（実時刻・?testdate の影響を受けない） */
function getCurrentSlot(d: Date): Slot {
  return d.getHours() < 15 ? 'morning' : 'evening'
}

function getRecorderName(shift: Shift | null, slot: Slot): string {
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  return names.length > 0 ? names.join('・') : NO_SHIFT_NAME
}

/** 展示スマホ専用の常設ディスプレイ画面（/display）。メンバー画面には影響しない独立ページ。 */
export function DisplayPage() {
  const [now,           setNow]           = useState(() => new Date())
  const [watering,      setWatering]      = useState<Watering | null>(null)
  const [shift,         setShift]         = useState<Shift | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showUndo,      setShowUndo]      = useState(false)

  const dateStr = formatDateStr(now)
  const slot    = getCurrentSlot(now)

  // 最新状態の取得。時刻・スロットもここで再計算するので、日付/15時をまたいでも次の更新で自動的に切り替わる
  const refresh = useCallback(async () => {
    const at = new Date()
    const ds = formatDateStr(at)
    const sl = getCurrentSlot(at)
    try {
      const [waterings, shifts] = await Promise.all([
        fetchWaterings(ds, ds),
        fetchShifts(ds, ds),
      ])
      setNow(at)
      setWatering(waterings.find(w => w.slot === sl) ?? null)
      setShift(shifts[0] ?? null)
      setError(null)
      // 自動更新のたびに閉じておく（開いたまま長時間放置されるのを防ぐ）
      setShowUndo(false)
    } catch (e) {
      console.error(e)
      setError('通信エラーが発生しました。次の自動更新で再試行します。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const status       = watering?.status ?? null
  const recorderName = getRecorderName(shift, slot)

  const runAction = async (fn: () => Promise<void>) => {
    setActionLoading(true)
    try {
      await fn()
      await refresh()
    } catch (e) {
      console.error(e)
      setError('操作に失敗しました。もう一度お試しください。')
    } finally {
      setActionLoading(false)
    }
  }

  const handleWater = () => runAction(async () => {
    const at = new Date()
    await upsertWatering(formatDateStr(at), getRecorderName(shift, getCurrentSlot(at)), null, 'watered', getCurrentSlot(at))
  })

  const handleRain = () => runAction(async () => {
    const at = new Date()
    await upsertWatering(formatDateStr(at), getRecorderName(shift, getCurrentSlot(at)), null, 'rain', getCurrentSlot(at))
  })

  const handleUndo = () => runAction(async () => {
    const at = new Date()
    await deleteWateringByDateSlot(formatDateStr(at), getCurrentSlot(at))
  })

  const label = slot === 'morning' ? '朝の水やり' : '夜の水やり'
  const emoji = slot === 'morning' ? '☀️' : '🌙'

  const cardBg = status === null
    ? 'bg-terra-50 border-4 border-terra-400'
    : status === 'watered'
      ? 'bg-leaf-50 border-4 border-leaf-300'
      : 'bg-blue-50 border-4 border-blue-200'

  const headline = status === null
    ? 'まだです'
    : status === 'watered' ? '済み' : '雨だった'

  const headlineColor = status === null
    ? 'text-terra-600'
    : status === 'watered' ? 'text-leaf-700' : 'text-blue-600'

  const Icon = status === null ? Droplets : status === 'watered' ? CheckCircle : CloudRain
  const iconColor = status === null
    ? 'text-terra-500'
    : status === 'watered' ? 'text-leaf-500' : 'text-blue-400'

  if (loading) {
    return (
      <div className="h-dvh w-screen bg-cream flex items-center justify-center">
        <p className="text-soil-400 text-xl">読み込み中...</p>
      </div>
    )
  }

  return (
    <div
      className="h-dvh w-screen bg-cream flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ヘッダー */}
      <header className="bg-soil-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          <div className="leading-tight">
            <p className="font-bold text-lg">草プロジェクト</p>
            <p className="text-xs text-soil-300">別館 展示ディスプレイ</p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="font-bold text-base">{formatDate(dateStr)}</p>
          <p className="text-xs text-soil-300">
            {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')} 更新
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-terra-100 text-terra-700 text-sm text-center py-2 px-4 shrink-0">
          {error}
        </div>
      )}

      {/* 画面いっぱいの水やりカード */}
      <main className="flex-1 flex flex-col p-5 min-h-0">
        <div className={`flex-1 min-h-0 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto ${cardBg}`}>
          <Icon className={iconColor} size={72} />

          <div className="text-center">
            <p className="text-2xl text-soil-500 font-medium">{emoji} {label}</p>
            <p className={`text-6xl font-black mt-2 ${headlineColor}`}>{headline}</p>
          </div>

          {/* 記録済み：誰が何時に対応したか */}
          {status !== null && watering && (
            <div className="bg-white/70 rounded-2xl px-6 py-4 text-center">
              <p className="text-xl text-soil-600">
                <span className="font-bold">{watering.by_name}</span>
                {' さんが '}
                <span className="font-bold">{formatTime(watering.created_at)}</span>
                {status === 'watered' ? ' に対応' : ' に雨と判断'}
              </p>
            </div>
          )}

          {/* 未対応：担当表示 + 操作ボタン */}
          {status === null && (
            <>
              <p className="text-lg text-soil-500">
                担当: <span className="font-bold text-soil-700">{recorderName}</span>
              </p>
              <div className="w-full flex flex-col gap-4 mt-2">
                <button
                  onClick={handleWater}
                  disabled={actionLoading}
                  className="w-full bg-leaf-500 text-white font-bold py-8 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 text-3xl shadow-md"
                >
                  <Droplets size={36} /> 水やりした
                </button>
                <button
                  onClick={handleRain}
                  disabled={actionLoading}
                  className="w-full bg-blue-400 text-white font-bold py-8 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 text-3xl shadow-md"
                >
                  <CloudRain size={36} /> 雨だった
                </button>
              </div>
            </>
          )}

          {/* 記録済み：取り消し（誤操作防止のため確認を挟む） */}
          {status !== null && (
            <div className="mt-4 w-full">
              {!showUndo ? (
                <div className="text-center">
                  <button
                    onClick={() => setShowUndo(true)}
                    className="text-base text-soil-400 underline underline-offset-4 py-3 px-4"
                  >
                    取り消す
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 border-2 border-terra-200 space-y-3">
                  <p className="text-base text-terra-600 font-medium text-center">本当に取り消しますか？</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUndo(false)}
                      className="flex-1 py-4 rounded-xl border-2 border-soil-200 text-soil-500 font-bold text-lg"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={actionLoading}
                      className="flex-1 py-4 rounded-xl bg-terra-500 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={20} /> 取り消す
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
