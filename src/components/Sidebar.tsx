'use client'
import { usePathname, useRouter } from 'next/navigation'
import { User } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const menus = [
  { label: 'Stock Barang', path: '/opname' },
  { label: 'Produk', path: '/produk' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('stokai_user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  function handleLogout() {
    localStorage.removeItem('stokai_user')
    router.push('/')
  }

  return (
    <div style={{
      width: '220px',
      minWidth: '220px',
      minHeight: '100vh',
      background: '#2D1B69',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: '0 20px 32px' }}>
        <p style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0 }}>Stok Mitra</p>
      </div>

      {/* Menu */}
      <div style={{ flex: 1 }}>
        {menus.map(menu => {
          const active = pathname === menu.path
          return (
            <button
              key={menu.path}
              onClick={() => router.push(menu.path)}
              style={{
                width: '100%', padding: '12px 20px',
                textAlign: 'left', border: 'none',
                background: active ? 'rgba(255,255,255,0.15)' : 'none',
                color: active ? 'white' : 'rgba(255,255,255,0.6)',
                fontSize: '14px', fontWeight: active ? '600' : '400',
                cursor: 'pointer', borderRadius: '0',
                borderLeft: active ? '3px solid white' : '3px solid transparent',
              }}
            >
              {menu.label}
            </button>
          )
        })}
      </div>

      {/* User info + logout */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '6px',
          }}>
            <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <p style={{ color: 'white', fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>{user?.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0 }}>{user?.outlet_name}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '9px',
            borderRadius: '8px', border: 'none',
            background: '#E53935', color: 'white',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Keluar
        </button>
      </div>

    </div>
  )
}