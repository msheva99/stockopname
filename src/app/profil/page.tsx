'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function ProfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('stokai_user')
    if (!raw) { router.push('/'); return }
    setUser(JSON.parse(raw))
  }, [router])

  function handleLogout() {
    localStorage.removeItem('stokai_user')
    router.push('/')
  }

  const roleLabel = {
    superadmin: 'Super Admin',
    owner: 'Owner',
    staff: 'Staff',
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '0.5px solid #e0e0dc',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Profil</h1>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Info user */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--color-primary-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
          }}>
            <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px' }}>{user?.name}</p>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{user?.outlet_name || 'Semua outlet'}</p>
        </div>

        {/* Detail */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f0f0ee' }}>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Role</p>
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
              {user?.role ? roleLabel[user.role] : '-'}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f0f0ee' }}>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Outlet</p>
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{user?.outlet_name || 'Semua outlet'}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Status</p>
            <span className="badge-success">Aktif</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            border: '0.5px solid var(--color-danger)', background: 'white',
            color: 'var(--color-danger)', fontSize: '14px', fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Keluar
        </button>

      </div>

      <BottomNav />
    </div>
  )
}