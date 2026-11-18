import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GardenScene, LogoSprout, SunIcon, MoonIcon, WateringCanIcon, RainCloudIcon, type SceneState } from '../components/illust/Illust'
import { fetchWaterings, fetchShifts, upsertWatering, deleteWateringByDateSlot } from '../lib/db'
import { formatDate, formatTime, effectiveNow } from '../lib/utils'
import { isDualSlotDate, type Slot } from '../lib/wateringRule'
import type { Watering, Shift } from '../types'

const REFRESH_MS = 30_000
const NO_SHIFT_NAME = '別館分室'
const EVENING_START_HOUR = 15

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 表示中の枠を返す。
 * - 朝のみの日（2枠制でない日）は終日「朝」のまま
 * - 2枠制の日は 0:00〜15:00 → 朝、15:00〜23:59 → 夜
 * 時刻は実時計、日付は ?testdate で上書き可（effectiveNow() 由来の Date を渡す）
 */
function getCurrentSlot(d: Date): Slot {
  if (!isDualSlotDate(formatDateStr(d))) return 'morning'
  return d.getHours() < EVENING_START_HOUR ? 'morning' : 'evening'
}

function getRecorderName(shift: Shift | null, slot: Slot): string {
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  return names.length > 0 ? names.join('・') : NO_SHIFT_NAME
}

/** 展示スマホ専用の常設ディスプレイ画面（/display）。メンバー画面には影響しない独立ページ。 */
export function DisplayPage() {
  const [now,           setNow]           = useState(() => effectiveNow())
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
    const at = effectiveNow()
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
    const at = effectiveNow()
    await upsertWatering(formatDateStr(at), getRecorderName(shift, getCurrentSlot(at)), null, 'watered', getCurrentSlot(at))
  })

  const handleRain = () => runAction(async () => {
    const at = effectiveNow()
    await upsertWatering(formatDateStr(at), getRecorderName(shift, getCurrentSlot(at)), null, 'rain', getCurrentSlot(at))
  })

  const handleUndo = () => runAction(async () => {
    const at = effectiveNow()
    await deleteWateringByDateSlot(formatDateStr(at), getCurrentSlot(at))
  })

  const label = slot === 'morning' ? '朝の水やり' : '夜の水やり'
  const night = slot === 'evening'
  const scene: SceneState = status === null ? 'todo' : status === 'watered' ? 'done' : 'rain'

  const headline = status === null
    ? 'まだ水やりしていません'
    : status === 'watered' ? '水やりおわり！' : '雨だったのでお休み'

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
      <header className="bg-sky border-b-2 border-ink px-6 py-3 flex items-center justify-between shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full -ml-2 pl-2 pr-4 py-1 hover:bg-white/50"
          aria-label="草プロジェクトの今日の画面へ"
        >
          <LogoSprout size={44} />
          <div className="leading-tight">
            <p className="font-black text-xl">草プロジェクト</p>
            <p className="text-xs text-soil-500">別館 展示ディスプレイ</p>
          </div>
        </Link>
        <div className="text-right leading-tight">
          <p className="font-black text-lg">{formatDate(dateStr)}</p>
          <p className="text-xs text-soil-500">
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
        <div className="hand-card flex-1 min-h-0 flex flex-col overflow-y-auto">
          <div className="border-b-2 border-ink shrink-0">
            <GardenScene state={scene} night={night} className="w-full h-56" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="text-center">
            <p className="text-2xl text-soil-500 font-bold flex items-center justify-center gap-2">
              {night ? <MoonIcon size={32} /> : <SunIcon size={32} />} {label}
            </p>
            <p className="text-5xl font-black mt-2">{headline}</p>
          </div>

          {/* 記録済み：誰が何時に対応したか */}
          {status !== null && watering && (
            <div className="text-center">
              <p className="text-2xl">
                <span className="font-bold">{watering.by_name}</span>
                {' さんが '}
                <span className="font-bold tabular-nums">{formatTime(watering.created_at)}</span>
                {status === 'watered' ? ' に水やりしました' : ' に雨と記録しました'}
              </p>
            </div>
          )}

          {/* 未対応：担当表示 + 操作ボタン */}
          {status === null && (
            <>
              <p className="text-2xl text-soil-500">
                今日の担当<span className="font-black text-ink ml-3">{recorderName}</span>
              </p>
              <div className="w-full flex flex-col gap-4 mt-2">
                <button
                  onClick={handleWater}
                  disabled={actionLoading}
                  className="hand-btn w-full bg-grass font-black py-8 disabled:opacity-50 flex items-center justify-center gap-3 text-3xl"
                >
                  <WateringCanIcon size={48} /> 水やりした
                </button>
                <button
                  onClick={handleRain}
                  disabled={actionLoading}
                  className="hand-btn w-full bg-sky font-black py-8 disabled:opacity-50 flex items-center justify-center gap-3 text-3xl"
                >
                  <RainCloudIcon size={48} /> 雨だった
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
                    className="text-base text-soil-500 underline underline-offset-4 py-3 px-4"
                  >
                    記録を取り消す
                  </button>
                </div>
              ) : (
                <div className="bg-terra-50 rounded-2xl p-4 border-2 border-ink space-y-3">
                  <p className="text-lg font-bold text-center">本当に取り消しますか？</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUndo(false)}
                      className="flex-1 py-4 rounded-xl border-2 border-ink/30 bg-white font-bold text-lg"
                    >
                      やめる
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={actionLoading}
                      className="flex-1 py-4 rounded-xl border-2 border-ink bg-clay font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={20} /> 取り消す
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}
