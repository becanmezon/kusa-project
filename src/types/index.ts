export interface Watering {
  id: string
  date: string                      // "YYYY-MM-DD"
  slot: 'morning' | 'evening'       // 朝 or 夜
  status: 'watered' | 'rain'        // 水やり済み or 雨でやらなかった
  by_name: string
  note: string | null
  created_at: string
}

export interface Shift {
  id: string
  date: string                    // "YYYY-MM-DD"
  morning_names: string[]         // 朝担当
  evening_names: string[]         // 夜担当
  created_at: string
}

export interface Vegetable {
  id: string
  name: string
  by_name: string
  note: string | null
  image_path: string
  day: string                     // "YYYY-MM-DD"
  created_at: string
}

export interface Post {
  id: string
  body: string
  image_paths: string[]
  by_name: string
  created_at: string
}

export interface Like {
  id: string
  post_id: string
  by_name: string
  created_at: string
}

export interface Reaction {
  id: string
  post_id: string
  emoji: string
  by_name: string
  created_at: string
}

export interface Reply {
  id: string
  post_id: string
  body: string
  by_name: string
  created_at: string
}
