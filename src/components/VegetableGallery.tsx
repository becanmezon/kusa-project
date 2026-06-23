import { useState, useRef } from 'react'
import { Camera, X, Leaf } from 'lucide-react'
import type { Vegetable } from '../types'
import { formatDate } from '../lib/utils'

interface Props {
  userName: string
  vegetables: Vegetable[]
  getImageUrl: (path: string) => string
  onUpload: (file: File, name: string, note: string) => Promise<void>
  onDelete: (veg: Vegetable) => Promise<void>
}

export function VegetableGallery({ userName, vegetables, getImageUrl, onUpload, onDelete }: Props) {
  const [selected, setSelected] = useState<Vegetable | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vegName, setVegName] = useState('')
  const [vegNote, setVegNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!file || !vegName.trim()) return
    setLoading(true)
    try {
      await onUpload(file, vegName.trim(), vegNote.trim())
      setShowForm(false)
      setFile(null)
      setPreview(null)
      setVegName('')
      setVegNote('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 投稿ボタン */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-leaf-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Camera size={20} />
        写真を投稿する
      </button>

      {/* 投稿フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-soil-100 space-y-3">
          <h2 className="font-bold text-soil-700">野菜の写真を投稿</h2>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-soil-200 rounded-xl p-4 text-center cursor-pointer hover:border-leaf-400 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full rounded-lg object-cover max-h-48" />
            ) : (
              <div className="text-soil-400 py-4">
                <Camera size={32} className="mx-auto mb-2" />
                <p className="text-sm">タップして写真を選ぶ</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <input
            type="text"
            value={vegName}
            onChange={e => setVegName(e.target.value)}
            placeholder="野菜の名前（必須）"
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400"
          />
          <textarea
            value={vegNote}
            onChange={e => setVegNote(e.target.value)}
            placeholder="メモ（任意）"
            rows={2}
            className="w-full border border-soil-200 rounded-lg px-3 py-2 text-sm text-soil-700 bg-cream focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
          />
          <p className="text-xs text-soil-400">投稿者: {userName}</p>

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setFile(null); setPreview(null) }}
              className="flex-1 py-2 rounded-xl border border-soil-200 text-sm text-soil-500"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !file || !vegName.trim()}
              className="flex-1 py-2 rounded-xl bg-leaf-500 text-white font-bold text-sm disabled:opacity-40"
            >
              {loading ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </div>
      )}

      {/* ギャラリーグリッド */}
      {vegetables.length === 0 ? (
        <div className="text-center py-12 text-soil-400">
          <Leaf size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">まだ写真がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {vegetables.map(veg => (
            <div
              key={veg.id}
              onClick={() => setSelected(veg)}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-soil-100 cursor-pointer active:scale-95 transition-transform"
            >
              {veg.image_path ? (
                <img
                  src={getImageUrl(veg.image_path)}
                  alt={veg.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-leaf-50 flex items-center justify-center">
                  <Leaf size={32} className="text-leaf-300" />
                </div>
              )}
              <div className="p-2">
                <p className="font-bold text-sm text-soil-700 truncate">{veg.name}</p>
                <p className="text-xs text-soil-400">{veg.by_name} · {formatDate(veg.day)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 拡大モーダル */}
      {selected && (
        <div
          className="fixed inset-0 bg-soil-900/80 z-50 flex flex-col"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white m-4 mt-12 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {selected.image_path ? (
              <img
                src={getImageUrl(selected.image_path)}
                alt={selected.name}
                className="w-full max-h-64 object-contain bg-soil-50"
              />
            ) : (
              <div className="w-full h-48 bg-leaf-50 flex items-center justify-center">
                <Leaf size={48} className="text-leaf-300" />
              </div>
            )}
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-lg text-soil-700">{selected.name}</h3>
              <p className="text-sm text-soil-500">{selected.by_name} · {formatDate(selected.day)}</p>
              {selected.note && <p className="text-sm text-soil-600 bg-cream rounded-lg p-3">「{selected.note}」</p>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-2 rounded-xl border border-soil-200 text-sm text-soil-500"
                >
                  閉じる
                </button>
                <button
                  onClick={async () => { await onDelete(selected); setSelected(null) }}
                  className="py-2 px-4 rounded-xl bg-terra-100 text-terra-600 text-sm font-medium flex items-center gap-1"
                >
                  <X size={14} />削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
