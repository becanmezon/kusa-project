// 紙の版：PCの今日画面の下に出す、Wのいちばん新しい投稿（罫線で区切った記事のように）
import type { Post, Reaction, Reply } from '../types'
import { timeLabel } from '../components/PostTimeline'
import { getVegetableImageUrl } from '../lib/db'
import { ReactionIcon } from '../components/illust/Illust'

export function PaperLatestPost({ posts, reactions, replies, onOpenAll }: {
  posts: Post[]
  reactions: Reaction[]
  replies: Reply[]
  onOpenAll: () => void
}) {
  const post = posts[0]
  const counts: [string, number][] = []
  if (post) {
    for (const r of reactions.filter(r => r.post_id === post.id)) {
      const hit = counts.find(([e]) => e === r.emoji)
      if (hit) hit[1]++
      else counts.push([r.emoji, 1])
    }
  }
  const replyCount = post ? replies.filter(r => r.post_id === post.id).length : 0
  const images = post?.image_paths ?? []

  return (
    <section className="py-6 border-t p-rule">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="text-sm lg:text-base font-bold tracking-widest p-sub">Wの最新の投稿</h2>
        <button onClick={onOpenAll} className="text-sm font-bold underline underline-offset-4">すべて見る →</button>
      </div>
      {!post ? (
        <p className="p-sub">まだつぶやきはありません</p>
      ) : (
        <button onClick={onOpenAll} className="block w-full text-left">
          <p className="mb-2">
            <span className="font-bold text-lg">{post.by_name}</span>
            <span className="p-num text-sm p-sub ml-3">{timeLabel(post.created_at)}</span>
            {post.edited_at && <span className="text-sm p-faint ml-2">（編集済み）</span>}
          </p>
          {post.body && <p className="text-lg leading-relaxed whitespace-pre-wrap mb-4">{post.body}</p>}
          {images.length > 0 && (
            <div className={`grid gap-1 mb-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.slice(0, 4).map(path => (
                <img
                  key={path}
                  src={getVegetableImageUrl(path)}
                  alt=""
                  className={`w-full object-cover rounded-[3px] ${images.length === 1 ? 'max-h-80' : 'aspect-square'}`}
                />
              ))}
            </div>
          )}
          {(counts.length > 0 || replyCount > 0) && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm p-sub">
              {counts.map(([emoji, n]) => (
                <span key={emoji} className="inline-flex items-center gap-1 p-num"><ReactionIcon name={emoji} size={18} />{n}</span>
              ))}
              {replyCount > 0 && <span>返信 <span className="p-num">{replyCount}</span></span>}
            </p>
          )}
        </button>
      )}
    </section>
  )
}
