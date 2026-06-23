export interface Watering {
  id: string
  date: string        // "YYYY-MM-DD"
  by_name: string
  note: string | null
  created_at: string
}

export interface Shift {
  id: string
  date: string        // "YYYY-MM-DD"
  names: string[]
  created_at: string
}

export interface Vegetable {
  id: string
  name: string
  by_name: string
  note: string | null
  image_path: string
  day: string         // "YYYY-MM-DD"
  created_at: string
}
