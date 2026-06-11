import { supabase, User } from './supabase'

export async function loginWithPhone(phone: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, outlets(name)')
    .eq('phone', phone.replace(/\D/g, ''))
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  // Password default: 4 digit terakhir nomor HP
  const last4 = phone.replace(/\D/g, '').slice(-4)
  if (password !== last4) return null

  const user: User = {
    id: data.id,
    name: data.name,
    role: data.role,
    outlet_id: data.outlet_id,
    outlet_name: data.outlets?.name,
    is_active: data.is_active,
  }

  localStorage.setItem('stokai_user', JSON.stringify(user))
  return user
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('stokai_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stokai_user')
  }
}