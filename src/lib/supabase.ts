import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('.env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
