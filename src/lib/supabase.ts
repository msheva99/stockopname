import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'superadmin' | 'owner' | 'staff'

export interface User {
  id: number
  name: string
  role: UserRole
  outlet_id: number | null
  outlet_name?: string
  is_active: boolean
}

export interface Product {
  id: number
  name: string
  unit: string
  category_id: number
}

export interface OutletStock {
  id: number
  outlet_id: number
  product_id: number
  buffer_qty: number
  current_qty: number
  product?: Product
}