// 野菜キャッチで落ちてくるものの絵（手描き風のオリジナルSVG）
// ゲームの canvas とルール説明の両方で同じ絵を使う

export type SpriteName = 'tomato' | 'carrot' | 'eggplant' | 'bug'

const INK = '#2e2924'
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

const SVG: Record<SpriteName, string> = {
  tomato: wrap(`
    <path d="M32 18 C46 17 56 26 55 39 C54 52 44 59 32 59 C20 59 10 52 9 39 C8 26 18 17 32 18 Z" fill="#ec5b4b"/>
    <path d="M32 21 L28 13 L33 17 L38 11 L36 19 L45 18 L37 23 L42 29 L33 25 L26 30 L28 23 L19 21 Z" fill="#8cc63f"/>
    <path d="M18 34 C18 29 21 26 24 25" fill="none" stroke="#fff" stroke-width="3"/>
  `),
  carrot: wrap(`
    <path d="M23 16 L28 8 L31 15 L34 6 L36 15 L41 9 L41 18" fill="#8cc63f"/>
    <path d="M20 19 C26 15 39 15 44 19 C45 30 38 47 33 58 C32 60 30 60 29 58 C25 47 18 30 20 19 Z" fill="#f2913d"/>
    <path d="M24 28 H30 M33 36 H39 M27 44 H32" fill="none"/>
  `),
  eggplant: wrap(`
    <path d="M38 17 C49 20 55 33 52 45 C49 56 38 61 28 57 C18 53 14 43 19 35 C23 29 29 28 31 22 C32 18 34 16 38 17 Z" fill="#7d55a6"/>
    <path d="M29 23 C31 15 39 12 46 15 C46 21 41 25 34 25 Z" fill="#8cc63f"/>
    <path d="M40 15 L44 6" fill="none" stroke-width="3"/>
    <path d="M24 42 C25 47 28 50 32 51" fill="none" stroke="#fff" stroke-width="3"/>
  `),
  bug: wrap(`
    <path d="M45 18 L48 9 M50 21 L58 15" fill="none"/>
    <circle cx="16" cy="44" r="9" fill="#9bd056"/>
    <circle cx="27" cy="40" r="10" fill="#9bd056"/>
    <circle cx="38" cy="33" r="10" fill="#9bd056"/>
    <circle cx="46" cy="25" r="10" fill="#b8e07a"/>
    <circle cx="43" cy="24" r="1.8" fill="${INK}" stroke="none"/>
    <circle cx="50" cy="23" r="1.8" fill="${INK}" stroke="none"/>
    <path d="M44 29 Q47 31 50 28" fill="none" stroke-width="2"/>
    <path d="M14 53 V57 M26 50 V55 M37 43 V48" fill="none"/>
  `),
}

export function spriteUrl(name: SpriteName): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG[name])
}

/** canvas で使う画像（読み込み済みのものを使い回す） */
const cache = new Map<SpriteName, HTMLImageElement>()
export function spriteImage(name: SpriteName): HTMLImageElement {
  let img = cache.get(name)
  if (!img) {
    img = new Image()
    img.src = spriteUrl(name)
    cache.set(name, img)
  }
  return img
}
