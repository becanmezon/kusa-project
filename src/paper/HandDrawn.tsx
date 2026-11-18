// 紙バージョンの手描き要素（この2つだけ）
// 線の太さを揺らすため、同じ線を「太い線」と「少しずらした細い線」の2回描き、紙の上のペンのようににじませる
import { useId } from 'react'

const INK = '#26221d'
const LEAF = '#3d7a2b'
const RAIN = '#2c6db0'

function Brush({ d, color = INK, width = 2.4, id }: { d: string; color?: string; width?: number; id: string }) {
  return (
    <g filter={`url(#${id})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke={color} strokeWidth={width * 0.5} transform="translate(0.9 0.7)" opacity={0.85} />
    </g>
  )
}

export type PaperWeather = 'todo' | 'done' | 'rain'

/** 鉢と芽の線画。天気（まだ＝日差し／済み＝水のしずく／雨＝雨の線）だけ描き足す */
export function SproutSketch({ weather, className }: { weather: PaperWeather; className?: string }) {
  const id = `b${useId().replace(/:/g, '')}`
  const label = weather === 'todo' ? '日差しの中の芽' : weather === 'done' ? '水をもらった芽' : '雨の中の芽'
  return (
    <svg viewBox="0 -34 128 134" className={className} role="img" aria-label={label}>
      <defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </defs>
      {/* 鉢：ひと筆で */}
      <Brush id={id} d="M16 50 C44 48 84 51 110 49 L104 59 L96 92 C95 95 93 96 90 96 L38 96 C35 96 33 95 32 92 L24 59 L104 59" />
      {/* 芽：茎から葉をひと続きに */}
      <Brush
        id={id}
        color={LEAF}
        width={2.6}
        d="M63 49 C63 40 62 32 63 22 C55 25 44 21 39 9 C50 6 60 12 63 22 C66 11 76 4 89 6 C87 17 77 24 63 26"
      />
      {weather === 'todo' && (
        <Brush id={id} width={1.8} d="M106 -14 C100 -14 98 -6 104 -3 C110 0 115 -8 110 -13 C108 -15 104 -15 102 -12 M106 -26 L106 -21 M120 -10 L115 -10 M116 -21 L112 -18 M96 -21 L99 -18" />
      )}
      {weather === 'done' && (
        <Brush id={id} color={RAIN} width={1.8} d="M44 -18 C41 -13 41 -10 44 -9 C47 -10 47 -13 44 -18 M66 -26 C63 -21 63 -18 66 -17 C69 -18 69 -21 66 -26 M86 -16 C83 -11 83 -8 86 -7 C89 -8 89 -11 86 -16" />
      )}
      {weather === 'rain' && (
        <Brush
          id={id}
          color={RAIN}
          width={1.8}
          d="M20 -28 l-4 9 M40 -30 l-4 9 M60 -28 l-4 9 M80 -30 l-4 9 M100 -28 l-4 9 M120 -30 l-4 9 M30 -12 l-4 9 M50 -14 l-4 9 M92 -12 l-4 9 M112 -14 l-4 9"
        />
      )}
    </svg>
  )
}

/** 鉛筆でぐるっと囲んだような丸（履歴の「今日」の印） */
export function HandCircle({ className }: { className?: string }) {
  const id = `c${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <filter id={id} x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2" />
        </filter>
      </defs>
      <Brush
        id={id}
        color={LEAF}
        width={2}
        d="M14 9 C34 2 92 1 110 9 C120 14 117 28 100 33 C78 39 32 38 14 32 C3 28 2 16 12 10 C20 6 30 5 40 5"
      />
    </svg>
  )
}
