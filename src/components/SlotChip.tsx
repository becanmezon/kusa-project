/** 朝／夜の小さな四角い印（状態のピルやボタンと混ざらないよう、角丸の四角で統一） */
export function SlotChip({ slot }: { slot: 'morning' | 'evening' }) {
  return (
    <span
      className={`inline-block w-6 h-6 leading-6 text-center text-xs font-black rounded-md border ${
        slot === 'morning' ? 'bg-sun/40 border-ink/30' : 'bg-[#3f5d80] text-white border-[#3f5d80]'
      }`}
    >
      {slot === 'morning' ? '朝' : '夜'}
    </span>
  )
}
