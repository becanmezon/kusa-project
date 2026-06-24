import { supabase } from './supabase'
import { resizeImage } from './utils'
import type { Watering, Shift, Vegetable } from '../types'

// ─── Waterings ────────────────────────────────────────────────

/** 指定期間の水やりレコードを取得 */
export async function fetchWaterings(fromDate: string, toDate: string): Promise<Watering[]> {
  const { data, error } = await supabase
    .from('waterings')
    .select('*')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 水やりを登録（date + slot がユニークなので upsert で上書き可） */
export async function upsertWatering(
  date: string,
  by_name: string,
  note: string | null,
  status: 'watered' | 'rain' = 'watered',
  slot: 'morning' | 'evening' = 'morning',
): Promise<Watering> {
  const { data, error } = await supabase
    .from('waterings')
    .upsert({ date, slot, by_name, note, status }, { onConflict: 'date,slot' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** 指定した日付・枠の水やりを取り消し */
export async function deleteWateringByDateSlot(
  date: string,
  slot: 'morning' | 'evening',
): Promise<void> {
  const { error } = await supabase
    .from('waterings')
    .delete()
    .eq('date', date)
    .eq('slot', slot)
  if (error) throw error
}

// ─── Shifts ───────────────────────────────────────────────────

/** シフトを取得（期間指定なしで全件） */
export async function fetchShifts(fromDate?: string, toDate?: string): Promise<Shift[]> {
  let q = supabase.from('shifts').select('*').order('date')
  if (fromDate) q = q.gte('date', fromDate)
  if (toDate)   q = q.lte('date', toDate)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

/** シフトを登録（date がユニークなので upsert で上書き可） */
export async function upsertShift(
  date: string,
  morning_names: string[],
  evening_names: string[],
): Promise<Shift> {
  const { data, error } = await supabase
    .from('shifts')
    .upsert({ date, morning_names, evening_names }, { onConflict: 'date' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** シフトを削除 */
export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) throw error
}

// ─── Vegetables ───────────────────────────────────────────────

/** 野菜写真を全件取得（新着順） */
export async function fetchVegetables(): Promise<Vegetable[]> {
  const { data, error } = await supabase
    .from('vegetables')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 野菜写真レコードを登録 */
export async function insertVegetable(
  name: string,
  by_name: string,
  note: string | null,
  image_path: string,
  day: string,
): Promise<Vegetable> {
  const { data, error } = await supabase
    .from('vegetables')
    .insert({ name, by_name, note, image_path, day })
    .select()
    .single()
  if (error) throw error
  return data
}

/** 野菜写真を削除（ストレージの画像も同時に削除） */
export async function deleteVegetable(id: string, image_path: string): Promise<void> {
  if (image_path) {
    await supabase.storage.from('veg-photos').remove([image_path])
  }
  const { error } = await supabase.from('vegetables').delete().eq('id', id)
  if (error) throw error
}

// ─── Storage（veg-photos バケット） ──────────────────────────

/**
 * 画像をリサイズ・圧縮してからアップロードし、保存パスを返す
 * ファイル名: {year}/{timestamp}-{random}.jpg
 */
export async function uploadVegetableImage(file: File): Promise<string> {
  const blob = await resizeImage(file) // 長辺900px / JPEG 0.8
  const year = new Date().getFullYear()
  const path = `${year}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { error } = await supabase.storage
    .from('veg-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

/** Supabase Storage の公開URLを返す */
export function getVegetableImageUrl(path: string): string {
  if (!path) return ''
  // すでに http:// で始まるURL（モック用）はそのまま返す
  if (path.startsWith('http')) return path
  return supabase.storage.from('veg-photos').getPublicUrl(path).data.publicUrl
}

// ─── 水やり履歴の整形 ────────────────────────────────────────

export interface HistoryEntry {
  date: string
  morning: Watering | null
  evening: Watering | null
}

/** 直近 days 日分の日付×朝夜水やり対応状況を返す */
export function buildWateringHistory(waterings: Watering[], days = 14): HistoryEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      date: ds,
      morning: waterings.find(w => w.date === ds && w.slot === 'morning') ?? null,
      evening: waterings.find(w => w.date === ds && w.slot === 'evening') ?? null,
    }
  })
}
