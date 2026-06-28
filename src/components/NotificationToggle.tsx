import { useState, useEffect } from 'react'
import { Bell, BellOff, Send, Loader2 } from 'lucide-react'
import { isSubscribed, subscribePush, unsubscribePush, sendTestNotification } from '../lib/push'

interface Props {
  userName: string
}

export function NotificationToggle({ userName }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    isSubscribed().then(v => {
      setSubscribed(v)
      setLoading(false)
    })
  }, [])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggle = async () => {
    setLoading(true)
    if (subscribed) {
      await unsubscribePush()
      setSubscribed(false)
      showMessage('通知をオフにしました')
    } else {
      const ok = await subscribePush(userName)
      setSubscribed(ok)
      if (ok) showMessage('通知をオンにしました！')
      else showMessage('通知の許可が得られませんでした')
    }
    setLoading(false)
  }

  const handleTest = async () => {
    setSending(true)
    try {
      await sendTestNotification(userName)
      showMessage('テスト通知を送りました 🌱')
    } catch {
      showMessage('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const notSupported =
    typeof window !== 'undefined' &&
    (!('serviceWorker' in navigator) || !('PushManager' in window))

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-soil-400" />
        <p className="text-sm font-medium text-soil-700">プッシュ通知</p>
      </div>

      {notSupported ? (
        <p className="text-xs text-soil-500 bg-soil-50 rounded-xl px-3 py-2.5 leading-relaxed">
          📱 iPhoneの場合は Safari で「ホーム画面に追加」して開くと通知が使えます
        </p>
      ) : (
        <>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${
              subscribed
                ? 'bg-soil-100 text-soil-600 border border-soil-200'
                : 'bg-leaf-500 text-white shadow-sm'
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : subscribed ? (
              <><BellOff size={16} /> 通知をオフにする</>
            ) : (
              <><Bell size={16} /> 通知をオンにする</>
            )}
          </button>

          {subscribed && (
            <button
              onClick={handleTest}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 border border-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <><Send size={16} /> 自分にテスト通知を送る</>
              )}
            </button>
          )}

          {message && (
            <p className="text-xs text-center text-leaf-600 font-medium">{message}</p>
          )}
        </>
      )}
    </div>
  )
}
