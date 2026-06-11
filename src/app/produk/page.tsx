'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, User } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

interface Product {
  id: number
  name: string
  unit: string
  category_name: string
}

interface OutletStock {
  product_id: number
  current_qty: number
  buffer_qty: number
}

export default function ProdukPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [outletStock, setOutletStock] = useState<OutletStock[]>([])
  const [loading, setLoading] = useState(true)
  const [showTambahMaster, setShowTambahMaster] = useState(false)
  const [showTambahOutlet, setShowTambahOutlet] = useState(false)
  const [namaProduk, setNamaProduk] = useState('')
  const [satuanProduk, setSatuanProduk] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [categories, setCategories] = useState<{id: number, name: string}[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [bufferQty, setBufferQty] = useState('')
  const [currentQty, setCurrentQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const loadData = useCallback(async (u: User) => {
    const { data: prodData } = await supabase
      .from('products')
      .select('id, name, unit, categories(name)')
      .order('name')

    if (prodData) {
      setProducts(prodData.map((p: any) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        category_name: p.categories?.name || '-',
      })))
    }

    if (u.outlet_id) {
      const { data: stockData } = await supabase
        .from('outlet_stock')
        .select('product_id, current_qty, buffer_qty')
        .eq('outlet_id', u.outlet_id)

      if (stockData) setOutletStock(stockData)
    }

    const { data: catData } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')

    if (catData) setCategories(catData)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('stokai_user')
    if (!raw) { router.push('/'); return }
    const u: User = JSON.parse(raw)
    setUser(u)
    loadData(u).finally(() => setLoading(false))
  }, [router, loadData])

  async function handleTambahMaster(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('products')
      .insert({ name: namaProduk, unit: satuanProduk, category_id: parseInt(kategoriId) })

    if (error) {
      setMessage('Gagal menambah produk.')
    } else {
      setMessage('Produk berhasil ditambahkan.')
      setNamaProduk(''); setSatuanProduk(''); setKategoriId('')
      setShowTambahMaster(false)
      loadData(user!)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleTambahOutlet(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.outlet_id) return
    setSaving(true)
    const { error } = await supabase
      .from('outlet_stock')
      .upsert({
        outlet_id: user.outlet_id,
        product_id: parseInt(selectedProduct),
        buffer_qty: parseFloat(bufferQty),
        current_qty: parseFloat(currentQty),
      }, { onConflict: 'outlet_id,product_id' })

    if (error) {
      setMessage('Gagal menambah produk ke outlet.')
    } else {
      setMessage('Produk berhasil ditambahkan ke outlet.')
      setSelectedProduct(''); setBufferQty(''); setCurrentQty('')
      setShowTambahOutlet(false)
      loadData(user!)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const isInOutlet = (productId: number) =>
    outletStock.some(s => s.product_id === productId)

  const getStock = (productId: number) =>
    outletStock.find(s => s.product_id === productId)

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>Memuat data produk...</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3' }}>
      <Sidebar />

      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Produk
            </h1>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{today}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {user?.role !== 'staff' && (
              <button
                onClick={() => { setShowTambahOutlet(true); setShowTambahMaster(false) }}
                style={{
                  padding: '9px 16px', borderRadius: '8px', fontSize: '13px',
                  border: '0.5px solid #d0d0cc', background: 'white',
                  cursor: 'pointer', fontWeight: '500',
                }}
              >
                + Ke outlet
              </button>
            )}
            {user?.role === 'superadmin' && (
              <button
                onClick={() => { setShowTambahMaster(true); setShowTambahOutlet(false) }}
                style={{
                  padding: '9px 16px', borderRadius: '8px', fontSize: '13px',
                  border: 'none', background: '#2D7A4F', color: 'white',
                  cursor: 'pointer', fontWeight: '600',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}
              >
                + Produk baru
              </button>
            )}
          </div>
        </div>

        {/* Notif */}
        {message && (
          <div style={{
            background: 'var(--color-success-light)', color: 'var(--color-success)',
            padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
          }}>
            {message}
          </div>
        )}

        {/* Modal tambah produk master */}
        {showTambahMaster && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}>
            <div style={{ background: 'white', borderRadius: '12px', width: '440px', overflow: 'hidden' }}>
              <div style={{ background: '#2D1B69', padding: '20px 24px' }}>
                <p style={{ color: 'white', fontSize: '16px', fontWeight: '700', margin: 0 }}>Produk Baru</p>
              </div>
              <div style={{ padding: '24px' }}>
                <form onSubmit={handleTambahMaster}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                      Nama Produk
                    </label>
                    <input
                      type="text"
                      value={namaProduk}
                      onChange={e => setNamaProduk(e.target.value)}
                      placeholder="Contoh: Oat Milk"
                      required
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                      Satuan
                    </label>
                    <input
                      type="text"
                      value={satuanProduk}
                      onChange={e => setSatuanProduk(e.target.value)}
                      placeholder="Contoh: liter, kg, pack, botol"
                      required
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                      Kategori
                    </label>
                    <select
                      value={kategoriId}
                      onChange={e => setKategoriId(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                        background: 'white', boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowTambahMaster(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', background: 'white',
                        fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '8px',
                        border: 'none', background: '#2D7A4F', color: 'white',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal tambah ke outlet */}
        {showTambahOutlet && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}>
            <div style={{ background: 'white', borderRadius: '12px', width: '440px', overflow: 'hidden' }}>
              <div style={{ background: '#2D1B69', padding: '20px 24px' }}>
                <p style={{ color: 'white', fontSize: '16px', fontWeight: '700', margin: 0 }}>Tambah ke Outlet</p>
              </div>
              <div style={{ padding: '24px' }}>
                <form onSubmit={handleTambahOutlet}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                      Pilih Produk
                    </label>
                    <select
                      value={selectedProduct}
                      onChange={e => setSelectedProduct(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                        background: 'white', boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Pilih produk</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit}){isInOutlet(p.id) ? ' — sudah ada' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                        Stok awal
                      </label>
                      <input
                        type="number"
                        value={currentQty}
                        onChange={e => setCurrentQty(e.target.value)}
                        placeholder="0"
                        min={0}
                        required
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px',
                          border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#444' }}>
                        Buffer minimum
                      </label>
                      <input
                        type="number"
                        value={bufferQty}
                        onChange={e => setBufferQty(e.target.value)}
                        placeholder="0"
                        min={0}
                        required
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px',
                          border: '0.5px solid #d0d0cc', fontSize: '14px', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowTambahOutlet(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '8px',
                        border: '0.5px solid #d0d0cc', background: 'white',
                        fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '8px',
                        border: 'none', background: '#2D7A4F', color: 'white',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >
                      {saving ? 'Menyimpan...' : 'Tambahkan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* List produk */}
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          Semua Produk
        </p>
        {products.map(product => {
          const stock = getStock(product.id)
          return (
            <div key={product.id} style={{
              background: 'white', borderRadius: '10px', padding: '14px 16px',
              marginBottom: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{product.name}</p>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                  {product.category_name} · {product.unit}
                </p>
              </div>
              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                {stock ? (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px' }}>
                      {stock.current_qty} <span style={{ fontSize: '12px', fontWeight: '400', color: '#888' }}>{product.unit}</span>
                    </p>
                    <span className={stock.current_qty < stock.buffer_qty ? 'badge-danger' : 'badge-success'}>
                      {stock.current_qty < stock.buffer_qty ? 'Kritis' : 'Aman'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: '#bbb' }}>Belum di outlet</span>
                )}
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}