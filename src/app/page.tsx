'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, User } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*, outlets(name)')
        .eq('username', username.trim().toLowerCase())
        .eq('pin', pin)
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Username atau PIN salah.')
        setLoading(false)
        return
      }

      const user: User = {
        id: data.id,
        name: data.name,
        role: data.role,
        outlet_id: data.outlet_id,
        outlet_name: data.outlets?.name,
        is_active: data.is_active,
      }

      localStorage.setItem('stokai_user', JSON.stringify(user))
      router.push('/opname')
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f0f0ee',
    }}>

      {/* Kiri — foto gudang */}
      <div style={{
        flex: 1,
        backgroundImage: 'url(/images/1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* Kanan — form */}
      <div style={{
        width: '460px',
        minWidth: '460px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        background: '#f0f0ee',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: '0 0 40px',
          color: '#1a1a1a',
        }}>
          Selamat Datang
        </h1>

        <form onSubmit={handleLogin}>

          {/* Username */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '13px',
              fontWeight: '500', marginBottom: '6px', color: '#555',
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoCapitalize="none"
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: '12px', border: 'none',
                fontSize: '15px', outline: 'none',
                background: 'white', color: '#1a1a1a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* PIN */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', fontSize: '13px',
              fontWeight: '500', marginBottom: '6px', color: '#555',
            }}>
              PIN
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={4}
                required
                inputMode="numeric"
                style={{
                  width: '100%', padding: '14px 60px 14px 16px',
                  borderRadius: '12px', border: 'none',
                  fontSize: '15px', outline: 'none',
                  background: 'white', color: '#1a1a1a',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  letterSpacing: showPin ? '0' : '0.3em',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute', right: '14px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px',
                  color: '#aaa', fontSize: '13px', fontWeight: '500',
                }}
              >
                {showPin ? 'Tutup' : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '10px 14px', borderRadius: '8px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px', border: 'none',
              background: '#2D7A4F', color: 'white',
              fontSize: '15px', fontWeight: '700',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Memuat...' : 'Login'}
          </button>

        </form>
      </div>
    </div>
  )
}