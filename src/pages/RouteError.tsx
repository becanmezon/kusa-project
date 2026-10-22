import { useEffect, useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

const RETRY_KEY = 'kusa_route_retry'

/**
 * ページが見つからない／エラーになったとき用の画面。
 * 古いバージョンのアプリがキャッシュに残っていて新しいページを知らないことが多いので、
 * 1回だけ最新版を取り直して自動で再読み込みする。
 */
export function RouteError() {
  const error = useRouteError()
  const is404 = isRouteErrorResponse(error) && error.status === 404
  // まだこのページで再読み込みを試していなければ、最新版を取り直す
  const [retrying] = useState(() => {
    try { return sessionStorage.getItem(RETRY_KEY) !== location.pathname } catch { return false }
  })

  useEffect(() => {
    if (!retrying) return
    try { sessionStorage.setItem(RETRY_KEY, location.pathname) } catch { /* noop */ }
    const reload = () => location.reload()
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {})
        .finally(() => setTimeout(reload, 800))
    } else {
      reload()
    }
  }, [retrying])

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">🌱</div>
      {retrying ? (
        <p className="text-soil-600">最新版を読み込んでいます…</p>
      ) : (
        <>
          <p className="text-soil-700 font-bold text-lg">
            {is404 ? 'ページが見つかりませんでした' : 'エラーが発生しました'}
          </p>
          <p className="text-soil-500 text-sm">一度アプリ（タブ）を閉じて開き直すと直ることがあります</p>
          <a href="/" className="bg-leaf-600 text-white font-bold rounded-full px-6 py-3">草プロジェクトに戻る</a>
        </>
      )}
    </div>
  )
}
