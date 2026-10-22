import { Feather, ChevronRight, MessageCircle } from 'lucide-react'
import { timeLabel } from './PostTimeline'
import type { Post, Reaction, Reply } from '../types'

interface Props {
  posts: Post[]
  reactions: Reaction[]
  replies: Reply[]
  getImageUrl: (path: string) => string
  onOpenAll: () => void
  limit?: number
}

/** PCの「今日」画面に出す、Wの最新投稿のコンパクト一覧 */
export function LatestPosts({ posts, reactions, replies, getImageUrl, onOpenAll, limit = 3 }: Props) {
  const latest = posts.slice(0, limit)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-soil-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-xs text-soil-400 flex items-center gap-1.5">
          <Feather size={13} /> Wの最新の投稿
        </p>
        <button onClick={onOpenAll} className="text-xs text-leaf-600 hover:underline flex items-center">
          すべて見る <ChevronRight size={13} />
        </button>
      </div>

      {latest.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-soil-300">まだつぶやきはありません</p>
      ) : (
        <ul>
          {latest.map(post => {
            const thumb = post.image_paths[0]
            const reactionCount = reactions.filter(r => r.post_id === post.id).length
            const replyCount = replies.filter(r => r.post_id === post.id).length
            return (
              <li key={post.id}>
                <button
                  onClick={onOpenAll}
                  className="w-full text-left flex gap-3 px-4 py-3 border-t border-soil-100 hover:bg-cream transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-soil-700 text-sm">{post.by_name}</span>
                      <span className="text-xs text-soil-400">{timeLabel(post.created_at)}</span>
                    </div>
                    {post.body && (
                      <p className="text-soil-700 text-sm leading-relaxed line-clamp-2 whitespace-pre-wrap">{post.body}</p>
                    )}
                    {(reactionCount > 0 || replyCount > 0) && (
                      <p className="text-xs text-soil-400 mt-1 flex items-center gap-3">
                        {reactionCount > 0 && <span>リアクション {reactionCount}</span>}
                        {replyCount > 0 && <span className="flex items-center gap-1"><MessageCircle size={11} />{replyCount}</span>}
                      </p>
                    )}
                  </div>
                  {thumb && (
                    <img src={getImageUrl(thumb)} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
