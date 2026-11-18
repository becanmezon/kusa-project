import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('.env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください')
}

/**
 * supabase-js は大きい（認証・ストレージ・リアルタイムを含む）ので、最初の表示には含めず、
 * 必要になったとき（リアルタイム更新・画像のアップロード・Wの操作など）に読み込む。
 */
let clientPromise: Promise<SupabaseClient> | null = null
export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey),
    )
  }
  return clientPromise
}
