// 手描き風のオリジナルイラスト・アイコン集（絵文字の代わりに使う）
// 線は「インク色」、塗りはフラットなパステル。少しだけ線を揺らして手描きの雰囲気を出す。
import { useId, type ReactNode, type SVGProps } from 'react'

import { INK, C } from './palette'
import { REACTION_LABELS } from './reactionMeta'

type IconProps = { size?: number; className?: string; title?: string }

/** 線をほんの少し揺らすフィルター（手描き感）付きの svg ラッパー */
function Hand({
  size = 24, viewBox, className, title, wobble = 1.2, children, ...rest
}: IconProps & { viewBox: string; wobble?: number; children: ReactNode } & Omit<SVGProps<SVGSVGElement>, 'viewBox'>) {
  const id = useId().replace(/:/g, '')
  // viewBox の大きさが違うアイコンでも、表示したときの線の太さがそろうようにする（24の枠で1.8が基準）
  const box = Number(viewBox.split(' ')[2]) || 24
  const baseStroke = (1.8 * box) / 24
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      <defs>
        <filter id={`w${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale={wobble} />
        </filter>
      </defs>
      <g
        filter={`url(#w${id})`}
        stroke={INK}
        strokeWidth={baseStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  )
}

// ─── ロゴ（植木鉢の芽） ──────────────────────────────────────
export function LogoSprout(p: IconProps) {
  return (
    <Hand viewBox="0 0 48 48" {...p}>
      <path d="M24 26 C24 20 24.4 16 24 11" fill="none" strokeWidth={4.2} />
      <path d="M24 17 C18 17.5 12 14 11 7.5 C17.5 6.5 23 10 24 17 Z" fill={C.leaf} />
      <path d="M24 14 C26 8 32 5 38.5 6 C38 12.5 31.5 15.5 24 14 Z" fill={C.grass} />
      <path d="M9.5 25 H38.5 C39.3 25 39.8 25.6 39.6 26.4 L39 29.6 C38.9 30.2 38.3 30.6 37.7 30.6 H10.3 C9.7 30.6 9.1 30.2 9 29.6 L8.4 26.4 C8.2 25.6 8.7 25 9.5 25 Z" fill={C.clay} />
      <path d="M11.2 30.6 H36.8 L34.2 43 C34 43.9 33.3 44.5 32.4 44.5 H15.6 C14.7 44.5 14 43.9 13.8 43 Z" fill={C.clay} />
      <circle cx="19.5" cy="36.5" r="1.3" fill={INK} stroke="none" />
      <circle cx="28.5" cy="36.5" r="1.3" fill={INK} stroke="none" />
      <path d="M22.5 39 Q24 40.3 25.5 39" fill="none" strokeWidth={2.6} />
    </Hand>
  )
}

// ─── 朝・夜 ────────────────────────────────────────────────
export function SunIcon(p: IconProps) {
  return (
    <Hand viewBox="0 0 24 24" {...p}>
      <g strokeWidth={1.7}>
        <path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" />
      </g>
      <circle cx="12" cy="12" r="5.6" fill={C.sun} />
    </Hand>
  )
}

export function MoonIcon(p: IconProps) {
  return (
    <Hand viewBox="0 0 24 24" {...p}>
      <path d="M15.5 3.2 A8.8 8.8 0 1 0 20.8 15.5 A7.2 7.2 0 0 1 15.5 3.2 Z" fill="#f3d77a" />
      <path d="M19.5 4.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill={C.paper} strokeWidth={1.2} />
    </Hand>
  )
}

// ─── じょうろ・雨雲・しおれた芽 ─────────────────────────────
export function WateringCanIcon(p: IconProps) {
  return (
    <Hand viewBox="0 0 32 32" {...p}>
      <path d="M8 12.5 H20 L19.2 26 C19.1 27 18.3 27.7 17.3 27.7 H10.7 C9.7 27.7 8.9 27 8.8 26 Z" fill={C.sea} />
      <path d="M8.3 15.5 C4.5 15.5 3.8 21.5 8.6 22.5" fill="none" />
      <path d="M19.6 17.5 L27 10.5" fill="none" strokeWidth={2.9} />
      <path d="M25.3 9 L28.8 12.2" strokeWidth={3.4} />
      <path d="M9.5 12.5 C10 8.5 18 8.5 18.5 12.5" fill="none" />
      <circle cx="29" cy="16" r=".9" fill={C.sea} stroke="none" />
      <circle cx="30.4" cy="19.5" r=".9" fill={C.sea} stroke="none" />
    </Hand>
  )
}

export function RainCloudIcon(p: IconProps) {
  return (
    <Hand viewBox="0 0 32 32" {...p}>
      <path d="M9 21 C4.8 21 3.8 15.2 7.8 14 C8 9.6 13.8 7.6 16.6 11 C19 7.6 25.2 9 25 13.6 C29.4 14 29 21 24.6 21 Z" fill={C.cloud} />
      <path d="M10 24.5 l-1.4 3.3 M16 24.5 l-1.4 3.3 M22 24.5 l-1.4 3.3" stroke={C.sea} strokeWidth={2.6} />
    </Hand>
  )
}

/** 傘（雨の見出しの横） */
export function UmbrellaIcon(p: IconProps) {
  return (
    <Hand viewBox="0 0 32 32" {...p}>
      <path d="M3 16 A13 13 0 0 1 29 16 Z" fill="#5AA9E6" />
      <path d="M16 3 V2 M16 16 V26 A3 3 0 0 1 10 26" fill="none" />
    </Hand>
  )
}

/** 記録済みのチェック（手描きの丸＋チェック） */
export function DoneMark(p: IconProps) {
  return (
    <Hand viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="9.5" fill={C.grass} />
      <path d="M7.5 12.4 L10.8 15.5 L16.8 8.8" fill="none" strokeWidth={2.2} />
    </Hand>
  )
}

/** 記録がなかったマーク（オレンジの丸に×） */
export function MissMark(p: IconProps) {
  return (
    <Hand viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="9.5" fill="#f6c3a6" />
      <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" fill="none" strokeWidth={2.2} />
    </Hand>
  )
}

/** まだのマーク（点線の丸） */
export function TodoMark(p: IconProps) {
  return (
    <Hand viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="9.5" fill="#fff4cf" strokeDasharray="3 2.6" />
      <circle cx="12" cy="12" r="1.5" fill={INK} stroke="none" />
    </Hand>
  )
}

// ─── 今日の水やりの様子（大きな挿絵） ─────────────────────────
export type SceneState = 'todo' | 'done' | 'rain'

/** 雨粒：同じ向き（左下）・同じ長さで、3段を互い違いに並べる */
const RAIN_PATH = [48, 74, 100]
  .flatMap((y, row) =>
    // 横長の枠でも端まで降るように、絵の外側（左右）にも並べておく
    Array.from({ length: 22 }, (_, i) => `M${-174 + i * 34 + (row % 2) * 17} ${y} l-6 16`),
  )
  .join(' ')

/** プランターと芽の挿絵。まだ＝しおれ気味、済み＝じょうろで水、雨＝雨雲 */
/** 状態ごとの色（空・草地・苗・鉢）。水やり済み＝晴れ、まだ＝乾いた暖色、雨＝暗い青灰 */
const SCENE_COLORS: Record<SceneState, { sky: string; grass: string; leafA: string; leafB: string; pot: string; rim: string }> = {
  done: { sky: '#CDEBFA', grass: '#C5E59A', leafA: '#a5d65c', leafB: '#7BC043', pot: '#D9A066', rim: '#E3B27C' },
  todo: { sky: '#FBD3B0', grass: '#DCE5A8', leafA: '#c3d68e', leafB: '#A9C46A', pot: '#D9A066', rim: '#E3B27C' },
  rain: { sky: '#8FA9BF', grass: '#A9CFA0', leafA: '#8cc56a', leafB: '#6DB24A', pot: '#C98F58', rim: '#D9A066' },
}

export function GardenScene({ state, night = false, className = 'w-full aspect-[12/5]' }: { state: SceneState; night?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  const col = SCENE_COLORS[state]
  const sky = night ? (state === 'rain' ? '#53657a' : '#3f5d80') : col.sky
  const happy = state !== 'todo'
  // 芽の葉っぱ（しおれているときは下向き）
  const leaves = (x: number, h: number, flip = false) => {
    const top = 104 - h
    const d = happy
      ? `M${x} ${top + 6} C${x - 12} ${top + 4} ${x - 20} ${top - 6} ${x - 20} ${top - 14} C${x - 9} ${top - 14} ${x - 2} ${top - 6} ${x} ${top + 6} Z`
      : `M${x} ${top + 4} C${x - 10} ${top + 2} ${x - 18} ${top + 8} ${x - 21} ${top + 16} C${x - 10} ${top + 17} ${x - 3} ${top + 12} ${x} ${top + 4} Z`
    const d2 = happy
      ? `M${x} ${top + 2} C${x + 4} ${top - 8} ${x + 13} ${top - 14} ${x + 22} ${top - 13} C${x + 21} ${top - 4} ${x + 12} ${top + 3} ${x} ${top + 2} Z`
      : `M${x} ${top + 2} C${x + 8} ${top + 1} ${x + 17} ${top + 6} ${x + 21} ${top + 14} C${x + 11} ${top + 16} ${x + 3} ${top + 10} ${x} ${top + 2} Z`
    return (
      <g key={x}>
        <path d={`M${x} 104 C${x} ${104 - h / 2} ${x + (happy ? 0 : 3)} ${top + 8} ${x} ${top + 3}`} fill="none" strokeWidth={2.4} />
        <path d={flip ? d2 : d} fill={col.leafA} />
        <path d={flip ? d : d2} fill={col.leafB} />
      </g>
    )
  }
  return (
    // 絵は切らずに全体を収め、足りない左右は空と地面の色で続ける
    <div
      className={`overflow-hidden ${className}`}
      style={{ background: `linear-gradient(to bottom, ${sky} 82.6%, ${INK} 82.6%, ${INK} calc(82.6% + 2px), ${col.grass} calc(82.6% + 2px))` }}
    >
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMax meet" className="block w-full h-full" overflow="visible" role="img" aria-label={
      state === 'todo' ? 'まだ水やりしていないプランター' : state === 'done' ? '水やりが終わったプランター' : '雨が降っているプランター'
    }>
      <defs>
        <filter id={`g${id}`} x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2" />
        </filter>
      </defs>
      <g filter={`url(#g${id})`} stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* 空のもの */}
        {night && state !== 'rain' && (
          <g>
            <path d="M306 20 A20 20 0 1 0 318 56 A16 16 0 0 1 306 20 Z" fill="#f3d77a" />
            <path d="M60 30l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5zM120 54l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2zM250 22l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#f3d77a" strokeWidth={1.2} />
          </g>
        )}
        {state === 'todo' && !night && (
          <g>
            <path d="M300 18v8M300 62v8M274 44h8M318 44h8M282 26l5 5M313 57l5 5M282 62l5-5M313 31l5-5" strokeWidth={2} />
            <circle cx="300" cy="44" r="14" fill={C.sun} />
          </g>
        )}
        {state === 'done' && (
          <g>
            {!night && <path d="M300 14v6M300 50v6M276 35h6M318 35h6" strokeWidth={2} />}
            {!night && <circle cx="300" cy="35" r="11" fill={C.sun} />}
            {/* じょうろ */}
            <g transform="translate(206 8) rotate(18 30 30)">
              <path d="M14 22 H44 L42 52 C41.8 54 40.2 55.5 38.2 55.5 H19.8 C17.8 55.5 16.2 54 16 52 Z" fill={C.sea} />
              <path d="M14.5 28 C5 28 4 41 15 43" fill="none" />
              <path d="M17 22 C18 13 40 13 41 22" fill="none" />
              <path d="M43 34 L60 18" strokeWidth={3} fill="none" />
              <path d="M56 14.5 L64 21.5" strokeWidth={4} />
            </g>
            <g stroke={C.sea} strokeWidth={2.4}>
              <path d="M262 44 l-6 10M270 50 l-6 10M256 58 l-6 10M266 66 l-6 10" />
            </g>
          </g>
        )}
        {state === 'rain' && (
          <g>
            {/* 雨：向きと長さをそろえて、空全体に散らす（雲と芽はこの上に描く） */}
            <path d={RAIN_PATH} stroke="#EAF6FF" strokeWidth={3.5} fill="none" />
            {/* 雲を3つ */}
            <path d="M28 40 C14 40 12 24 24 21 C25 9 43 5 50 15 C57 6 75 10 74 23 C86 24 86 40 72 40 Z" fill="#EEF3F7" />
            <path d="M152 30 C136 30 133 12 147 8 C149 -6 172 -10 180 3 C189 -8 212 -3 211 12 C225 13 225 30 210 30 Z" fill="#DDE5EC" transform="translate(180 18) scale(0.8) translate(-180 -10)" />
            <path d="M276 42 C262 42 260 26 272 23 C273 11 291 7 298 17 C305 8 323 12 322 25 C334 26 334 42 320 42 Z" fill="#EEF3F7" />
          </g>
        )}
        {/* 地面 */}
        <path d="M-4 124 C40 122 80 128 120 125 C170 121 220 128 270 124 C310 121 340 126 364 124 V154 H-4 Z" fill={col.grass} stroke="none" />
        <path d="M-4 124 C40 122 80 128 120 125 C170 121 220 128 270 124 C310 121 340 126 364 124" fill="none" />
        {/* プランター */}
        {/* 雨の日は地面に水たまり */}
        {state === 'rain' && (
          <g stroke="none" fill="#BFE3F5">
            <ellipse cx="34" cy="138" rx="24" ry="4.5" />
            <ellipse cx="326" cy="140" rx="26" ry="4.5" />
          </g>
        )}
        <path d="M70 100 H290 L284 136 C283.5 139 281 141 278 141 H82 C79 141 76.5 139 76 136 Z" fill={col.pot} />
        <path d="M64 96 H296 C298 96 299.5 97.6 299 99.5 L298 103.5 C297.6 105 296.4 106 295 106 H65 C63.6 106 62.4 105 62 103.5 L61 99.5 C60.5 97.6 62 96 64 96 Z" fill={col.rim} />
        <path d="M100 118 H110 M128 128 H140 M222 128 H234 M252 118 H262" strokeWidth={1.6} />
        {/* 芽たち */}
        {leaves(130, 34)}
        {leaves(180, 44, true)}
        {leaves(230, 36)}
        {/* プランターの顔 */}
        <g stroke="none" fill={INK}>
          <circle cx="172" cy="118" r="2.2" />
          <circle cx="188" cy="118" r="2.2" />
        </g>
        {happy ? (
          <path d="M175.5 123 Q180 127.5 184.5 123" fill="none" strokeWidth={2} />
        ) : (
          <path d="M175.5 125.5 Q180 122 184.5 125.5" fill="none" strokeWidth={2} />
        )}
        {/* ほっぺ（困り顔のときは描かない） */}
        {happy && <circle cx="165" cy="123" r="3.4" fill="#F4A7A0" stroke="none" />}
        {happy && <circle cx="195" cy="123" r="3.4" fill="#F4A7A0" stroke="none" />}
        {state === 'todo' && <path d="M200 108 C203 112 204 115 201.5 116.5 C199 117.5 197.5 114.5 200 108 Z" fill="#5AA9E6" strokeWidth={1.4} />}
        {/* 水やり済み：葉の上に水滴 */}
        {state === 'done' && (
          <g fill="#5AA9E6" strokeWidth={1.4}>
            <path d="M112 66 q-4 6 0 8 q4 -2 0 -8 z" />
            <path d="M154 74 q-4 6 0 8 q4 -2 0 -8 z" />
            <path d="M206 62 q-4 6 0 8 q4 -2 0 -8 z" />
            <path d="M246 72 q-4 6 0 8 q4 -2 0 -8 z" />
          </g>
        )}
      </g>
    </svg>
    </div>
  )
}

// ─── W のリアクション（保存されている絵文字キー → 手描きアイコン） ──
function Face({ fill = C.sun, children }: { fill?: string; children: ReactNode }) {
  return (
    <>
      <circle cx="12" cy="12.5" r="9" fill={fill} />
      {children}
    </>
  )
}

const REACTION_ICONS: Record<string, { draw: () => ReactNode }> = {
  '❤️': {
    draw: () => <path d="M12 20 C5 15.5 2.8 11.8 3.4 8.6 C4 5.4 8.4 4 12 7.8 C15.6 4 20 5.4 20.6 8.6 C21.2 11.8 19 15.5 12 20 Z" fill="#ee7b7b" />,
  },
  '👍': {
    draw: () => (
      <>
        <path d="M3.5 11 H7 V20.5 H3.5 Z" fill={C.sea} />
        <path d="M7 11 L10.5 4.2 C11.6 3.4 13.4 4 13.2 5.8 L12.6 9.4 H18.6 C20 9.4 21 10.8 20.6 12.2 L18.9 18.8 C18.6 19.8 17.7 20.5 16.6 20.5 H7 Z" fill="#f5cd96" />
      </>
    ),
  },
  '🌱': {
    draw: () => (
      <>
        <path d="M12 21 V12" fill="none" strokeWidth={2} />
        <path d="M12 14 C7 14 3.6 11 3.4 6.4 C8 6.2 11.6 9 12 14 Z" fill={C.leaf} />
        <path d="M12 12 C12.6 7 16 4 20.6 4.2 C20.6 8.8 17 11.8 12 12 Z" fill={C.grass} />
      </>
    ),
  },
  '🎉': {
    draw: () => (
      <>
        <path d="M3.5 20.5 L8 8.5 L15.5 16 Z" fill={C.sun} />
        <path d="M6 14 L10 18" fill="none" strokeWidth={1.4} />
        <path d="M13 5 l1.2-2.2 M17.5 9.5 l2.4-.8 M16 4.5 c1 1.2 2.4 1.2 3.4 0" fill="none" stroke="#ee7b7b" strokeWidth={1.8} />
        <circle cx="19.5" cy="13.5" r="1.1" fill={C.sea} stroke="none" />
        <circle cx="11" cy="3.5" r="1.1" fill={C.grass} stroke="none" />
      </>
    ),
  },
  '🫡': {
    draw: () => (
      <Face>
        <path d="M8 11 h2.6 M13.6 11 h2.6" fill="none" strokeWidth={1.7} />
        <path d="M9.5 16.2 h5" fill="none" strokeWidth={1.7} />
        <path d="M14.5 3 L21.5 7.5 L19.8 9.6 L13.6 5.6 Z" fill="#f5cd96" strokeWidth={1.5} />
      </Face>
    ),
  },
  '😭': {
    draw: () => (
      <Face>
        <path d="M7.6 10.6 q1.6 -1.4 3.2 0 M13.2 10.6 q1.6 -1.4 3.2 0" fill="none" strokeWidth={1.6} />
        <path d="M9.5 17.5 q2.5 -3 5 0 Z" fill={INK} strokeWidth={1.4} />
        <path d="M8.2 12 V21 M15.8 12 V21" stroke={C.sea} strokeWidth={2.2} fill="none" />
      </Face>
    ),
  },
  '🦀': {
    draw: () => (
      <>
        <path d="M5 9 C2.6 8 2.4 4.6 4.6 3.6 L5.6 6 L7 4 C8.4 5.4 7.6 8.4 5 9 Z" fill="#ec6a5c" strokeWidth={1.4} />
        <path d="M19 9 C21.4 8 21.6 4.6 19.4 3.6 L18.4 6 L17 4 C15.6 5.4 16.4 8.4 19 9 Z" fill="#ec6a5c" strokeWidth={1.4} />
        <path d="M6 11.5 L5 9 M18 11.5 L19 9" fill="none" strokeWidth={1.4} />
        <path d="M5 21 L7.4 17.6 M19 21 L16.6 17.6 M3.6 18.2 L6.2 15.8 M20.4 18.2 L17.8 15.8" fill="none" strokeWidth={1.4} />
        <ellipse cx="12" cy="14.6" rx="7" ry="4.8" fill="#ec6a5c" />
        <path d="M10 10 V8.4 M14 10 V8.4" fill="none" strokeWidth={1.4} />
        <circle cx="10" cy="8" r="1.3" fill="#fff" strokeWidth={1.2} />
        <circle cx="14" cy="8" r="1.3" fill="#fff" strokeWidth={1.2} />
      </>
    ),
  },
}

export function ReactionIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const r = REACTION_ICONS[name]
  if (!r) return <span className={className} style={{ fontSize: size * 0.8 }}>{name}</span>
  return (
    <Hand viewBox="0 0 24 24" size={size} className={className} title={REACTION_LABELS[name]} wobble={0.8}>
      {r.draw()}
    </Hand>
  )
}

// ─── 順位のメダル ─────────────────────────────────────────
const MEDAL_FILL = ['#f6c445', '#d6dde3', '#e3a874']

export function Medal({ place, size = 26, className }: { place: number; size?: number; className?: string }) {
  if (place > 2) {
    return (
      <span className={`inline-flex items-center justify-center font-bold text-soil-500 ${className ?? ''}`} style={{ width: size, height: size }}>
        {place + 1}
      </span>
    )
  }
  return (
    <Hand viewBox="0 0 26 26" size={size} className={className} title={`${place + 1}位`} wobble={0.8}>
      <path d="M8 2 L11 10 M18 2 L15 10" fill="none" stroke={place === 0 ? '#ee7b7b' : C.sea} strokeWidth={3} />
      <circle cx="13" cy="16" r="8" fill={MEDAL_FILL[place]} />
      <text x="13" y="20.2" textAnchor="middle" fontSize="11" fontWeight="900" fill={INK} stroke="none" fontFamily="'Zen Maru Gothic', sans-serif">
        {place + 1}
      </text>
    </Hand>
  )
}

/** 空っぽ・エラー表示などで使う大きめの芽 */
export function BigSprout({ size = 72, className }: { size?: number; className?: string }) {
  return <LogoSprout size={size} className={className} />
}
