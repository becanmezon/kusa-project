import { useEffect, useRef, useState } from 'react'

/**
 * 画面に入る直前（200px手前）になって初めて読み込む画像。
 * ブラウザ標準の loading="lazy" はかなり先まで読み込んでしまうので、自分で見張って順番に読み込む。
 * 読み込み前は薄い色の枠を表示して、画面がガタつかないようにする。
 */
export function LazyImage({ src, alt = '', className = '', reserve }: {
  src: string
  alt?: string
  className?: string
  /** 読み込み前に確保しておく高さ（高さが決まっていない画像用）例: 'min-h-48' */
  reserve?: string
}) {
  const ref = useRef<HTMLImageElement>(null)
  // IntersectionObserver がない古いブラウザでは、最初から読み込む
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const ob = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); ob.disconnect() }
    }, { rootMargin: '200px 0px' })
    ob.observe(el)
    return () => ob.disconnect()
  }, [visible])

  return (
    <img
      ref={ref}
      src={visible ? src : undefined}
      alt={alt}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : `opacity-0 ${reserve ?? ''}`}`}
      style={loaded ? undefined : { backgroundColor: 'rgba(46, 41, 36, 0.06)', opacity: 1 }}
    />
  )
}
