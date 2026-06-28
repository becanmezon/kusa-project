import { useState, useEffect } from 'react'
import { Bell, BellOff, Send, Loader2, AlertCircle } from 'lucide-react'
import { isSubscribed, subscribePush, unsubscribePush, sendTestNotification } from '../lib/push'

interface Props {
  userName: string
}

function permissionStatus(): NotificationPermission | 'unknown' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unknown'
  return Notification.permission
}

export function NotificationToggle({ userName }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setBlocked(permissionStatus() === 'denied')
    isSubscribed().then(v => {
      setSubscribed(v)
      setLoading(false)
    })
  }, [])

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleToggle = async () => {
    setLoading(true)
    setMessage(null)
    if (subscribed) {
      await unsubscribePush()
      setSubscribed(false)
      showMsg('通知をオフにしました')
    } else {
      const result = await subscribePush(userName)
      if (result === 'ok') {
        setSubscribed(true)
        showMsg('通知をオンにしました！')
      } else if (result === 'permission_denied') {
        setBlocked(true)
        showMsg('通知がブロックされています。下の手順で設定を変更してください。', 'err')
      } else if (result === 'no_vapid_key') {
        showMsg('VAPIDの公開鍵が未設定です。Vercelの環境変数を確認して再デプロイしてください。', 'err')
      } else {
        showMsg('登録に失敗しました。VAPIDキーのペアが正しいか確認してください。', 'err')
      }
    }
    setLoading(false)
  }

  const handleTest = async () => {
    setSending(true)
    try {
      await sendTestNotification(userName)
      showMsg('テスト通知を送りました 🌱')
    } catch {
      showMsg('送信に失敗しました', 'err')
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
            <p className={`text-xs text-center font-medium ${message.type === 'err' ? 'text-terra-500' : 'text-leaf-600'}`}>
              {message.text}
            </p>
          )}

          {blocked && (
            <div className="bg-terra-50 border border-terra-200 rounded-xl px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-terra-500 shrink-0" />
                <p className="text-xs font-bold text-terra-600">通知がブロックされています</p>
              </div>
              <p className="text-xs text-terra-500 leading-relaxed pl-5">
                設定アプリ → Safari → 詳細 → Webサイトの設定 → 通知 → このサイトを「許可」に変更してください
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
