import { ChevronRight, MessageCircle } from 'lucide-react'
import { ReactionIcon } from './illust/Illust'
import { timeLabel } from '../lib/timeLabel'
import { LazyImage } from './LazyImage'
import type { Post, Reaction, Reply } from '../types'

interface Props {
  posts: Post[]
  reactions: Reaction[]
  replies: Reply[]
  getImageUrl: (path: string) => string
  onOpenAll: () => void
}

/** PCの「今日」画面に出す、Wのいちばん新しい投稿（1件を大きく表示） */
export function LatestPosts({ posts, reactions, replies, getImageUrl, onOpenAll }: Props) {
  const post = posts[0]

  // リアクションを絵文字ごとにまとめる（押された順）
  const emojiCounts: [string, number][] = []
  if (post) {
    for (const r of reactions.filter(r => r.post_id === post.id)) {
      const hit = emojiCounts.find(([e]) => e === r.emoji)
      if (hit) hit[1]++
      else emojiCounts.push([r.emoji, 1])
    }
  }
  const replyCount = post ? replies.filter(r => r.post_id === post.id).length : 0
  const images = post?.image_paths ?? []

  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pb-2">
        <p className="text-sm lg:text-base font-bold text-soil-500">Wの最新の投稿</p>
        <button onClick={onOpenAll} className="text-sm text-leaf-600 hover:underline flex items-center">
          すべて見る <ChevronRight size={15} />
        </button>
      </div>

      {!post ? (
        <p className="px-4 lg:px-6 pb-4 lg:pb-6 text-base text-soil-400">まだつぶやきはありません</p>
      ) : (
        <button onClick={onOpenAll} className="w-full text-left px-4 lg:px-6 pb-4 lg:pb-6 hover:bg-cream/60 transition-colors">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-bold text-soil-700 text-lg">{post.by_name}</span>
            <span className="text-sm text-soil-400 tabular-nums">{timeLabel(post.created_at)}</span>
            {post.edited_at && <span className="text-sm text-soil-300">（編集済み）</span>}
          </div>

          {post.body && (
            <p className="text-soil-700 text-lg leading-relaxed whitespace-pre-wrap mb-4">{post.body}</p>
          )}

          {images.length > 0 && (
            <div className={`grid gap-1 rounded-xl overflow-hidden mb-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.slice(0, 4).map(path => (
                <LazyImage
                  key={path}
                  src={getImageUrl(path)}
                  className={`w-full object-cover ${images.length === 1 ? 'max-h-80' : 'aspect-square'}`}
                />
              ))}
            </div>
          )}

          {(emojiCounts.length > 0 || replyCount > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-soil-500">
              {emojiCounts.map(([emoji, count]) => (
                <span key={emoji} className="inline-flex items-center gap-1 font-bold tabular-nums">
                  <ReactionIcon name={emoji} size={20} /> {count}
                </span>
              ))}
              {replyCount > 0 && (
                <span className="flex items-center gap-1 ml-1"><MessageCircle size={14} />{replyCount}</span>
              )}
            </div>
          )}
        </button>
      )}
    </div>
  )
}
