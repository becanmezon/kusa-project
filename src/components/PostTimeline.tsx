import { useState, useRef } from 'react'
import { Feather, Trash2, ImageIcon, X, Plus, MessageCircle } from 'lucide-react'
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
  onExpand: (url: string) => void
}) {
  if (paths.length === 0) return null
  const urls = paths.map(p => getImageUrl(p))

  if (paths.length === 1) {
    return (
      <button className="block w-full mb-3" onClick={() => onExpand(urls[0])}>
        <img src={urls[0]} className="rounded-xl w-full max-h-72 object-cover" loading="lazy" alt="" />
      </button>
    )
  }

  if (paths.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3">
        {urls.map((src, i) => (
          <button key={i} className="aspect-square" onClick={() => onExpand(src)}>
            <img src={src} className="w-full h-full object-cover" loading="lazy" alt="" />
          </button>
        ))}
      </div>
    )
  }

  if (paths.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3 h-48">
        <button className="row-span-2" onClick={() => onExpand(urls[0])}>
          <img src={urls[0]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
        <button onClick={() => onExpand(urls[1])}>
          <img src={urls[1]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
        <button onClick={() => onExpand(urls[2])}>
          <img src={urls[2]} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
      </div>
    )
  }

  // 4枚: 2×2
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mb-3">
      {urls.map((src, i) => (
        <button key={i} className="aspect-square" onClick={() => onExpand(src)}>
          <img src={src} className="w-full h-full object-cover" loading="lazy" alt="" />
        </button>
      ))}
    </div>
  )
}

// ── リアクションバー ──────────────────────────────────────────
function ReactionBar({ postId, reactions, userName, onReact }: {
  postId: string
  reactions: Reaction[]
  userName: string
  onReact: (emoji: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const postReactions = reactions.filter(r => r.post_id === postId)
  const grouped = EMOJIS
    .map(emoji => ({
      emoji,
      count: postReactions.filter(r => r.emoji === emoji).length,
      reacted: postReactions.some(r => r.emoji === emoji && r.by_name === userName),
    }))
    .filter(g => g.count > 0)

  const handleEmoji = (emoji: string) => {
    onReact(emoji)
    setPickerOpen(false)
  }

  return (
    <div className="relative flex flex-wrap gap-1.5 items-center">
      {grouped.map(g => (
        <button
          key={g.emoji}
          onClick={() => onReact(g.emoji)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors active:scale-95 ${
            g.reacted
              ? 'bg-leaf-100 border-leaf-400 text-leaf-700 font-medium'
              : 'bg-soil-50 border-soil-200 text-soil-600 hover:border-leaf-300'
          }`}
        >
          <span>{g.emoji}</span>
          <span className="text-xs tabular-nums">{g.count}</span>
        </button>
      ))}

      <button
        onClick={() => setPickerOpen(p => !p)}
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
          <div className="absolute bottom-full mb-1.5 right-0 bg-white rounded-2xl shadow-xl border border-soil-100 p-2 flex gap-1 z-20">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmoji(emoji)}
                className="text-xl p-1.5 rounded-xl hover:bg-soil-50 active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
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
  const [expandedImg,    setExpandedImg]    = useState<string | null>(null)
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
                  onExpand={setExpandedImg}
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

      {/* 画像拡大モーダル */}
      {expandedImg && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <img src={expandedImg} className="max-w-full max-h-full rounded-xl" alt="" />
        </div>
      )}

    </div>
  )
}
