import { useState, useRef } from 'react'
import { Feather, Heart, Trash2, ImageIcon, X } from 'lucide-react'
import type { Post, Like } from '../types'

interface Props {
  userName: string
  posts: Post[]
  likes: Like[]
  onPost: (body: string, image: File | null) => Promise<void>
  onDelete: (post: Post) => Promise<void>
  onLike: (post: Post) => Promise<void>
  getImageUrl: (path: string) => string
}

function timeLabel(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}時間前`
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${hh}:${mm}`
}

export function PostTimeline({ userName, posts, likes, onPost, onDelete, onLike, getImageUrl }: Props) {
  const [body,         setBody]         = useState('')
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting,      setPosting]      = useState(false)
  const [expandedImg,  setExpandedImg]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePost = async () => {
    if (!body.trim() && !imageFile) return
    setPosting(true)
    try {
      await onPost(body.trim(), imageFile)
      setBody('')
      clearImage()
    } finally {
      setPosting(false)
    }
  }

  const canPost = !posting && (body.trim().length > 0 || !!imageFile)

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

        {/* 画像プレビュー */}
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} className="h-28 rounded-xl object-cover" alt="preview" />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-soil-600 text-white rounded-full p-0.5 shadow"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-soil-400 text-sm hover:text-leaf-500 transition-colors"
          >
            <ImageIcon size={18} /> 画像
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

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
            const postLikes = likes.filter(l => l.post_id === post.id)
            const isLiked   = postLikes.some(l => l.by_name === userName)
            const isAuthor  = post.by_name === userName

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

                {/* 画像 */}
                {post.image_path && (
                  <button
                    className="block w-full mb-3"
                    onClick={() => setExpandedImg(getImageUrl(post.image_path!))}
                  >
                    <img
                      src={getImageUrl(post.image_path)}
                      className="rounded-xl w-full max-h-72 object-cover"
                      loading="lazy"
                      alt=""
                    />
                  </button>
                )}

                {/* いいね */}
                <div className="flex items-center gap-2 pt-2 border-t border-soil-50">
                  <button
                    onClick={() => onLike(post)}
                    className={`flex items-center gap-1.5 text-sm transition-colors active:scale-90 ${
                      isLiked ? 'text-red-500' : 'text-soil-300 hover:text-red-400'
                    }`}
                  >
                    <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                  {/* 投稿者本人のみいいね数を表示 */}
                  {isAuthor && postLikes.length > 0 && (
                    <span className="text-xs text-soil-400 font-medium">
                      {postLikes.length}
                    </span>
                  )}
                </div>

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
