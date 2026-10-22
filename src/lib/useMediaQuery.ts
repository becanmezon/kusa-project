import { useEffect, useState } from 'react'

/** 画面幅などのメディアクエリに一致しているかを返す（ウィンドウサイズの変更にも追従） */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** PCレイアウトにする幅（Tailwind の lg と同じ 1024px 以上） */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/** 横に広いPC（3列表示にする幅。Tailwind の xl と同じ 1280px 以上） */
export function useIsWideDesktop(): boolean {
  return useMediaQuery('(min-width: 1280px)')
}
