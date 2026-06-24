'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, User } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

interface StockItem {
  stock_id: number
  product_id: number
  product_name: string
  unit: string
  pack_size: number
  system_qty: number
  buffer_qty: number
  physical_qty: number
}

export default function OpnamePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [note, setNote] = useState('')

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const loadStock = useCallback(async (outletId: number) => {
    const { data, error } = await supabase
      .from('outlet_stock')
      .select('id, product_id, current_qty, buffer_qty, products(name, unit, pack_size)')
      .eq('outlet_id', outletId)

    if (error || !data) return

    setItems(data.map((row: any) => ({
      stock_id: row.id,
      product_id: row.product_id,
      product_name: row.products.name,
      unit: row.products.unit,
      pack_size: row.products.pack_size ?? 1,
      system_qty: row.current_qty,
      buffer_qty: row.buffer_qty,
      physical_qty: row.current_qty,
    })))
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('stokai_user')
    if (!raw) { router.push('/'); return }
    const u: User = JSON.parse(raw)
    setUser(u)
    if (u.outlet_id) loadStock(u.outlet_id).finally(() => setLoading(false))
    else setLoading(false)
  }, [router, loadStock])

  function updateQty(productId: number, value: number) {
    setItems(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, physical_qty: Math.max(0, value) }
        : item
    ))
  }

  function adjustQty(productId: number, delta: number) {
    setItems(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, physical_qty: Math.max(0, item.physical_qty + delta) }
        : item
    ))
  }

  const criticalItems = items.filter(i => i.physical_qty < i.buffer_qty)
  const changedItems = items.filter(i => i.physical_qty !== i.system_qty)

  async function handleSubmit() {
    if (!user?.outlet_id) return
    setSubmitting(true)

    try {
      const todayDate = new Date().toISOString().split('T')[0]

      const opnameRows = items.map(item => ({
        outlet_id: user.outlet_id,
        product_id: item.product_id,
        user_id: user.id,
        opname_date: todayDate,
        qty_system: item.system_qty,
        qty_physical: item.physical_qty,
        note: note || null,
      }))

      const { error: opnameError } = await supabase
        .from('stock_opname')
        .insert(opnameRows)

      if (opnameError) throw opnameError

      for (const item of items) {
        const diff = item.physical_qty - item.system_qty
        if (diff !== 0) {
          await supabase
            .from('outlet_stock')
            .update({ current_qty: item.physical_qty })
            .eq('id', item.stock_id)

          await supabase.from('stock_logs').insert({
            outlet_id: user.outlet_id,
            product_id: item.product_id,
            user_id: user.id,
            type: 'opname',
            qty_before: item.system_qty,
            qty_change: diff,
            qty_after: item.physical_qty,
            note: note || null,
            source: 'web',
          })
        }
      }

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: user.outlet_id,
          outlet_name: user.outlet_name,
          staff_name: user.name,
          note: note || null,
          items: items.map(i => ({
            product_name: i.product_name,
            unit: i.unit,
            system_qty: i.system_qty,
            physical_qty: i.physical_qty,
            buffer_qty: i.buffer_qty,
          })),
        }),
      })

      setSubmitted(true)
    } catch (err) {
      alert('Gagal menyimpan opname. Coba lagi.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>Memuat data stok...</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--color-success-light)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
          }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-success)' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px' }}>Opname berhasil disimpan</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px' }}>{items.length} produk tercatat</p>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px' }}>{changedItems.length} perubahan</p>
          {criticalItems.length > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--color-warning)', margin: '8px 0 24px' }}>
              {criticalItems.length} item stok kritis — notifikasi dikirim ke owner
            </p>
          )}
          <button className="btn-primary" onClick={() => { setSubmitted(false); loadStock(user!.outlet_id!) }}>
            Opname baru
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3' }}>
      <Sidebar />

      <div style={{ marginLeft: '220px', flex: 1, padding: '32px', paddingBottom: '60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Stock Barang
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{today}</p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>Total Produk</p>
            <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{items.length}</p>
          </div>
          <div style={{
            background: criticalItems.length > 0 ? 'var(--color-warning-light)' : 'white',
            borderRadius: '12px', padding: '16px',
          }}>
            <p style={{ fontSize: '12px', color: criticalItems.length > 0 ? 'var(--color-warning)' : '#888', margin: '0 0 6px' }}>
              Stok Kritis
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: criticalItems.length > 0 ? 'var(--color-warning)' : '#1a1a1a' }}>
              {criticalItems.length}
            </p>
          </div>
          <div style={{
            background: changedItems.length > 0 ? '#E6F1FB' : 'white',
            borderRadius: '12px', padding: '16px',
          }}>
            <p style={{ fontSize: '12px', color: changedItems.length > 0 ? '#185FA5' : '#888', margin: '0 0 6px' }}>
              Perubahan
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: changedItems.length > 0 ? '#185FA5' : '#1a1a1a' }}>
              {changedItems.length}
            </p>
          </div>
        </div>

        {/* Layout kondisional */}
        {criticalItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Perlu Perhatian
              </p>
              {criticalItems.map(item => (
                <ProductRow key={item.product_id} item={item} onUpdate={updateQty} onAdjust={adjustQty} critical />
              ))}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Semua Produk
              </p>
              {items.filter(i => i.physical_qty >= i.buffer_qty).map(item => (
                <ProductRow key={item.product_id} item={item} onUpdate={updateQty} onAdjust={adjustQty} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Semua Produk
            </p>
            {items.map(item => (
              <ProductRow key={item.product_id} item={item} onUpdate={updateQty} onAdjust={adjustQty} />
            ))}
          </div>
        )}

        {/* Catatan */}
        <div style={{ marginBottom: '16px', maxWidth: '480px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
            Catatan (opsional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Misal: ada produk rusak, kondisi gudang, dll"
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '0.5px solid #d0d0cc', fontSize: '14px',
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              background: 'white',
            }}
          />
        </div>

        {/* Submit */}
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '13px 32px', fontSize: '14px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          {submitting ? 'Menyimpan...' : 'Perbarui Stok'}
        </button>

      </div>
    </div>
  )
}

function ProductRow({
  item, onUpdate, onAdjust, critical = false
}: {
  item: StockItem
  onUpdate: (id: number, val: number) => void
  onAdjust: (id: number, delta: number) => void
  critical?: boolean
}) {
  const diff = item.physical_qty - item.system_qty
  const packSize = item.pack_size ?? 1
  const systemPack = (item.system_qty / packSize).toFixed(1)
  const bufferPack = (item.buffer_qty / packSize).toFixed(1)

  return (
    <div style={{
      background: critical ? 'var(--color-warning-light)' : 'white',
      border: `0.5px solid ${critical ? '#EF9F27' : '#e0e0dc'}`,
      borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.product_name}
        </p>
        <p style={{ fontSize: '11px', color: critical ? 'var(--color-warning)' : '#888', margin: 0 }}>
          Stok: {item.system_qty} {item.unit} ({systemPack} pack) · Minimal: {item.buffer_qty} {item.unit} ({bufferPack} pack)
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => onAdjust(item.product_id, -1)}
          style={{
            width: '26px', height: '26px', borderRadius: '6px',
            border: '0.5px solid #d0d0cc', background: 'white',
            cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <input
          type="number"
          value={item.physical_qty}
          onChange={e => onUpdate(item.product_id, parseFloat(e.target.value) || 0)}
          min={0}
          style={{
            width: '48px', height: '28px', textAlign: 'center',
            fontSize: '14px', fontWeight: '500', borderRadius: '6px',
            border: '0.5px solid #d0d0cc', outline: 'none', background: 'white',
          }}
        />
        <button
          onClick={() => onAdjust(item.product_id, 1)}
          style={{
            width: '26px', height: '26px', borderRadius: '6px',
            border: '0.5px solid #d0d0cc', background: 'white',
            cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>

      <span
        className={diff === 0 ? 'badge-success' : diff < 0 ? 'badge-danger' : 'badge-success'}
        style={{ minWidth: '32px', textAlign: 'center', fontSize: '11px' }}
      >
        {diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}
      </span>
    </div>
  )
}