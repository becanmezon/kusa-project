import { useState, useRef, useEffect } from 'react'
import { Feather, Trash2, ImageIcon, X, Plus, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Post, Reaction, Reply } from '../types'

const MAX_IMAGES = 4
const EMOJIS = ['👍', '❤️', '😂', '🌱', '🎉', '🫡', '😭']

interface Props {
  userName: string
  posts: Post[]
  reactions: Reaction[]
  replies: Reply[]
  onPost: (body: string, images: File[]) => Promise<void>
  onDelete: (post: Post) => Promise<void>
  onReact: (post: Post, emoji: string) => Promise<void>
  onReply: (post: Post, body: string) => Promise<void>
  onDeleteReply: (reply: Reply) => Promise<void>
  getImageUrl: (path: string) => string
}

function timeLabel(isoStr: string): string {
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

// ── 画像グリッド（X風レイアウト） ────────────────────────────
function ImageGrid({ paths, getImageUrl, onExpand }: {
  paths: string[]
  getImageUrl: (path: string) => string
  onExpand: (urls: string[], index: number) => void
}) {
  if (paths.length === 0) return null
  const urls = paths.map(p => getImageUrl(p))
  const open = (i: number) => onExpand(urls, i)

  if (paths.length === 1) {
    return (
      <button className="block w-full mb-3" onClick={() => open(0)}>
        <img src={urls[0]} className="rounded-xl w-full max-h-72 object-cover" loading="lazy" alt="" />
      </button>
    )
  }

  if (paths.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3">
        {urls.map((src, i) => (
          <button key={i} className="aspect-square" onClick={() => open(i)}>
            <img src={src} className="w-full h-full object-cover" loading="lazy" alt="" />
          </button>
        ))}
      </div>
    )
  }

  if (paths.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3 h-48">
        <button className="row-span-2" onClick={() => open(0)}>
          <img src={urls[0]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
        <button onClick={() => open(1)}>
          <img src={urls[1]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
        <button onClick={() => open(2)}>
          <img src={urls[2]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
      </div>
    )
  }

  // 4枚: 2×2
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3">
      {urls.map((src, i) => (
        <button key={i} className="aspect-square" onClick={() => open(i)}>
          <img src={src} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
      ))}
    </div>
  )
}

// ── ライトボックス（拡大表示・スワイプ/矢印/キーボードナビ） ──
function Lightbox({ urls, initialIndex, onClose }: {
  urls: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const go = (delta: number) =>
    setIndex(i => Math.max(0, Math.min(urls.length - 1, i + delta)))

  // キーボード操作（矢印キー・Escape）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // 縦より横の移動量が大きいときだけスワイプと見なす
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) go(-1)
      else        go(1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex flex-col select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 閉じるボタン */}
      <div className="flex justify-end p-3 shrink-0">
        <button onClick={onClose} className="text-white/60 hover:text-white p-2 transition-colors">
          <X size={22} />
        </button>
      </div>

      {/* 画像エリア */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-10">
        <img
          key={index}
          src={urls[index]}
          className="max-w-full max-h-full object-contain rounded-xl"
          alt=""
          draggable={false}
        />

        {/* 左矢印（PC用） */}
        {index > 0 && (
          <button
            onClick={() => go(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* 右矢印（PC用） */}
        {index < urls.length - 1 && (
          <button
            onClick={() => go(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* ドットインジケーター */}
      {urls.length > 1 && (
        <div className="flex justify-center gap-2 py-4 shrink-0">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 絵文字ピル（タッチ長押し・マウスホバーで名前表示、タップ/クリックでトグル） ──
function EmojiPill({ emoji, count, reacted, isActive, onToggle, onShowNames, onHideNames, onLongPress }: {
  emoji: string
  count: number
  reacted: boolean
  isActive: boolean
  onToggle: () => void
  onShowNames: () => void
  onHideNames: () => void
  onLongPress: () => void
}) {
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress     = useRef(false)
  const lastPointerType = useRef('')

  const startLongPress = () => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, 500)
  }

  const cancelLongPress = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  return (
    <button
      onContextMenu={e => e.preventDefault()}
      onPointerDown={e => {
        lastPointerType.current = e.pointerType
        if (e.pointerType === 'touch') startLongPress()
      }}
      onPointerUp={e => {
        if (e.pointerType === 'touch') {
          cancelLongPress()
          if (!isLongPress.current) onToggle()
        }
      }}
      onPointerCancel={cancelLongPress}
      onPointerLeave={e => {
        if (e.pointerType === 'touch') cancelLongPress()
        if (e.pointerType === 'mouse') onHideNames()
      }}
      onPointerEnter={e => {
        if (e.pointerType === 'mouse') onShowNames()
      }}
      onClick={() => {
        // タッチ操作はpointerUpで処理済みのため、マウスクリックのみここで処理
        if (lastPointerType.current === 'mouse') onToggle()
      }}
      className={`select-none flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors ${
        reacted
          ? 'bg-leaf-100 border-leaf-400 text-leaf-700 font-medium'
          : 'bg-soil-50 border-soil-200 text-soil-600 hover:border-leaf-300'
      } ${isActive ? 'ring-2 ring-leaf-300 ring-offset-1' : ''}`}
    >
      <span>{emoji}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </button>
  )
}

// ── リアクションバー ──────────────────────────────────────────
function ReactionBar({ postId, reactions, userName, onReact }: {
  postId: string
  reactions: Reaction[]
  userName: string
  onReact: (emoji: string) => void
}) {
  const [pickerOpen,  setPickerOpen]  = useState(false)
  // lockedEmoji: 長押しで表示（オーバーレイで閉じる）
  // hoverEmoji:  ホバーで表示（pointerleaveで自動で消える）
  const [lockedEmoji, setLockedEmoji] = useState<string | null>(null)
  const [hoverEmoji,  setHoverEmoji]  = useState<string | null>(null)

  const activeEmoji = lockedEmoji ?? hoverEmoji

  const postReactions = reactions.filter(r => r.post_id === postId)
  const grouped = EMOJIS
    .map(emoji => ({
      emoji,
      count: postReactions.filter(r => r.emoji === emoji).length,
      reacted: postReactions.some(r => r.emoji === emoji && r.by_name === userName),
    }))
    .filter(g => g.count > 0)

  const activeNames = activeEmoji
    ? postReactions.filter(r => r.emoji === activeEmoji).map(r => r.by_name)
    : []

  const handlePickerEmoji = (emoji: string) => {
    onReact(emoji)
    setPickerOpen(false)
  }

  const handlePickerToggle = () => {
    setLockedEmoji(null)
    setHoverEmoji(null)
    setPickerOpen(p => !p)
  }

  return (
    <div className="relative">
      {/* 長押しで開いた名前一覧を閉じるオーバーレイ（ホバー時は不要） */}
      {lockedEmoji && (
        <div className="fixed inset-0 z-10" onClick={() => setLockedEmoji(null)} />
      )}

      <div className="relative z-20 flex flex-wrap gap-1.5 items-center">
        {grouped.map(g => (
          <EmojiPill
            key={g.emoji}
            emoji={g.emoji}
            count={g.count}
            reacted={g.reacted}
            isActive={activeEmoji === g.emoji}
            onToggle={() => { onReact(g.emoji); setLockedEmoji(null) }}
            onShowNames={() => {
              setPickerOpen(false)
              // ホバー表示はロック中は上書きしない
              if (lockedEmoji) return
              setHoverEmoji(g.emoji)
            }}
            onHideNames={() => setHoverEmoji(null)}
            onLongPress={() => {
              setPickerOpen(false)
              setHoverEmoji(null)
              setLockedEmoji(g.emoji)
            }}
          />
        ))}

        {/* 絵文字を追加/取り消しするピッカー */}
        <button
          onClick={handlePickerToggle}
          className={`flex items-center justify-center w-8 h-7 rounded-full border transition-colors ${
            pickerOpen
              ? 'bg-soil-100 border-soil-300 text-soil-600'
              : 'bg-soil-50 border-soil-200 text-soil-400 hover:border-leaf-300 hover:text-leaf-500'
          }`}
        >
          <Plus size={13} />
        </button>

        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="absolute bottom-full mb-1.5 right-0 bg-white rounded-2xl shadow-xl border border-soil-100 p-2 flex gap-1 z-30">
              {EMOJIS.map(emoji => {
                const alreadyReacted = postReactions.some(r => r.emoji === emoji && r.by_name === userName)
                return (
                  <button
                    key={emoji}
                    onClick={() => handlePickerEmoji(emoji)}
                    className={`text-xl p-1.5 rounded-xl active:scale-90 transition-transform ${
                      alreadyReacted ? 'bg-leaf-100 ring-1 ring-leaf-400' : 'hover:bg-soil-50'
                    }`}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 名前一覧 */}
      {activeEmoji && activeNames.length > 0 && (
        <div className="relative z-20 mt-1.5 flex items-center gap-1.5 bg-soil-50 rounded-xl px-3 py-1.5 text-sm">
          <span>{activeEmoji}</span>
          <span className="text-soil-600">{activeNames.join('、')}</span>
        </div>
      )}
    </div>
  )
}

// ── 返信フォーム ──────────────────────────────────────────────
function ReplyForm({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value.slice(0, 100))}
        placeholder="返信を書く..."
        rows={2}
        className="flex-1 border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!body.trim() || submitting}
        className="bg-leaf-500 text-white font-bold px-3 py-2 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-40 shrink-0"
      >
        送信
      </button>
    </div>
  )
}

export function PostTimeline({
  userName, posts, reactions, replies,
  onPost, onDelete, onReact, onReply, onDeleteReply,
  getImageUrl,
}: Props) {
  const [body,           setBody]           = useState('')
  const [imageFiles,     setImageFiles]     = useState<File[]>([])
  const [imagePreviews,  setImagePreviews]  = useState<string[]>([])
  const [posting,        setPosting]        = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[], index: number } | null>(null)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addImages = (files: File[]) => {
    const slots = MAX_IMAGES - imageFiles.length
    const toAdd = files.slice(0, slots)
    if (toAdd.length === 0) return
    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(Array.from(e.target.files ?? []))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePost = async () => {
    if (!body.trim() && imageFiles.length === 0) return
    setPosting(true)
    try {
      await onPost(body.trim(), imageFiles)
      setBody('')
      imagePreviews.forEach(u => URL.revokeObjectURL(u))
      setImageFiles([])
      setImagePreviews([])
    } finally {
      setPosting(false)
    }
  }

  const canPost = !posting && (body.trim().length > 0 || imageFiles.length > 0)

  const toggleReply = (postId: string) =>
    setExpandedPostId(prev => (prev === postId ? null : postId))

  return (
    <div className="space-y-4">

      {/* 投稿フォーム */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 100))}
          placeholder={`${userName} のつぶやき（100文字まで）`}
          rows={3}
          className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
        />

        {imagePreviews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((url, i) => (
              <div key={i} className="relative shrink-0">
                <img src={url} className="w-20 h-20 rounded-xl object-cover" alt="" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-soil-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            {imageFiles.length < MAX_IMAGES ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-soil-400 text-sm hover:text-leaf-500 transition-colors"
              >
                <ImageIcon size={18} />
                {imageFiles.length > 0
                  ? <span className="tabular-nums">{imageFiles.length}/{MAX_IMAGES}</span>
                  : <span>画像</span>
                }
              </button>
            ) : (
              <span className="text-xs text-soil-300">画像は最大4枚です</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs tabular-nums ${body.length > 90 ? 'text-terra-500 font-bold' : 'text-soil-300'}`}>
              {body.length}/100
            </span>
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="bg-leaf-500 text-white font-bold px-5 py-2 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
              投稿
            </button>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      {posts.length === 0 ? (
        <div className="text-center py-14 text-soil-400">
          <Feather size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">まだつぶやきはありません</p>
          <p className="text-xs mt-1 opacity-60">最初の一言を投稿してみよう</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map(post => {
            const isAuthor   = post.by_name === userName
            const postReplies = replies.filter(r => r.post_id === post.id)
            const isExpanded  = expandedPostId === post.id

            return (
              <li key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100">

                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-soil-700 text-sm">{post.by_name}</span>
                    <span className="text-xs text-soil-400">{timeLabel(post.created_at)}</span>
                  </div>
                  {isAuthor && (
                    <button
                      onClick={() => { if (confirm('この投稿を削除しますか？')) onDelete(post) }}
                      className="text-soil-200 hover:text-terra-400 transition-colors p-1 -mr-1 -mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* 本文 */}
                {post.body && (
                  <p className="text-soil-700 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                    {post.body}
                  </p>
                )}

                {/* 画像グリッド */}
                <ImageGrid
                  paths={post.image_paths}
                  getImageUrl={getImageUrl}
                  onExpand={(urls, index) => setLightbox({ urls, index })}
                />

                {/* フッター: リアクション ＋ 返信ボタン */}
                <div className="flex items-center gap-3 pt-2 border-t border-soil-50">
                  <div className="flex-1 min-w-0">
                    <ReactionBar
                      postId={post.id}
                      reactions={reactions}
                      userName={userName}
                      onReact={emoji => onReact(post, emoji)}
                    />
                  </div>
                  <button
                    onClick={() => toggleReply(post.id)}
                    className={`flex items-center gap-1 shrink-0 transition-colors ${
                      isExpanded ? 'text-leaf-600' : 'text-soil-400 hover:text-leaf-500'
                    }`}
                  >
                    <MessageCircle size={16} />
                    {postReplies.length > 0 && (
                      <span className="text-xs tabular-nums font-medium">{postReplies.length}</span>
                    )}
                  </button>
                </div>

                {/* 返信パネル */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-soil-100 space-y-3">

                    {/* 返信一覧 */}
                    {postReplies.length > 0 && (
                      <ul className="space-y-2">
                        {postReplies.map(reply => (
                          <li key={reply.id} className="flex gap-2 items-start">
                            <div className="flex-1 bg-soil-50 rounded-xl px-3 py-2">
                              <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="font-bold text-soil-700 text-xs">{reply.by_name}</span>
                                <span className="text-xs text-soil-400">{timeLabel(reply.created_at)}</span>
                              </div>
                              <p className="text-soil-700 text-sm whitespace-pre-wrap leading-relaxed">
                                {reply.body}
                              </p>
                            </div>
                            {reply.by_name === userName && (
                              <button
                                onClick={() => { if (confirm('この返信を削除しますか？')) onDeleteReply(reply) }}
                                className="text-soil-200 hover:text-terra-400 transition-colors mt-2 shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* 返信入力フォーム */}
                    <ReplyForm onSubmit={body => onReply(post, body)} />
                  </div>
                )}

              </li>
            )
          })}
        </ul>
      )}

      {/* ライトボックス */}
      {lightbox && (
        <Lightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

    </div>
  )
}
