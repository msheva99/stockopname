'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import Sidebar from '@/components/Sidebar'

interface StockReduction {
  product_id: number
  product_name: string
  unit: string
  total_reduction: number
}

export default function SyncPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string[]>([])
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [stockPreview, setStockPreview] = useState<StockReduction[]>([])
  const [pendingRows, setPendingRows] = useState<any[]>([])
  const [synced, setSynced] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult([])
    setError('')
    setPreview([])
    setStockPreview([])
    setSynced(false)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet)

      const validRows = rows.filter(
        r => r['Nama'] && r['Jumlah Barang'] && r['Nama'] !== 'Total Semua'
      )

      setPreview(validRows)
      setPendingRows(validRows)

      // Fetch estimasi pengurangan stok
      const res = await fetch('/api/sync-kasir/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })
      const data = await res.json()
      if (data.success) {
        setStockPreview(data.reductions)
      }
    } catch (err) {
      setError('Gagal membaca file')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    setError('')
    setResult([])

    try {
      const res = await fetch('/api/sync-kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: pendingRows }),
      })

      const data = await res.json()
      if (data.success) {
        setResult(data.logs)
        setSynced(true)
        setPreview([])
        setStockPreview([])
      } else {
        setError(data.error || 'Terjadi kesalahan')
      }
    } catch (err) {
      setError('Gagal sync data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3' }}>
      <Sidebar />

      <div style={{ marginLeft: '220px', flex: 1, padding: '32px', paddingBottom: '60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Sync Kasir Pintar
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Upload laporan penjualan untuk update stok otomatis
          </p>
        </div>

        {/* Upload */}
        {!preview.length && !synced && (
          <div style={{
            background: 'white', borderRadius: '12px',
            padding: '24px', marginBottom: '24px',
            border: '0.5px solid #e0e0dc',
          }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>
              Download laporan penjualan dari Kasir Pintar format .xls, lalu upload di sini.
            </p>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '8px',
              background: '#2D1B69', color: 'white',
              fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}>
              <span>Pilih File .XLS</span>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFile}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            background: 'white', borderRadius: '12px',
            padding: '24px', textAlign: 'center',
            border: '0.5px solid #e0e0dc', marginBottom: '24px',
          }}>
            <p style={{ color: '#888', margin: 0 }}>Memproses file...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--color-danger-light)', color: 'var(--color-danger)',
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && !synced && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

            {/* Kiri: Data penjualan */}
            <div style={{
              background: 'white', borderRadius: '12px',
              padding: '24px', border: '0.5px solid #e0e0dc',
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>
                Data Penjualan
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px' }}>
                {preview.length} item dari laporan Kasir Pintar
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0dc' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>
                      Menu
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>
                      Terjual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid #f0f0ee' }}>
                      <td style={{ padding: '7px 8px', color: '#1a1a1a' }}>{row['Nama']}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '500' }}>{row['Jumlah Barang']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kanan: Estimasi pengurangan stok */}
            <div style={{
              background: 'white', borderRadius: '12px',
              padding: '24px', border: '0.5px solid #e0e0dc',
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>
                Estimasi Pengurangan Stok
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px' }}>
                Berdasarkan resep per menu
              </p>

              {stockPreview.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#aaa' }}>Menghitung estimasi...</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e0e0dc' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>
                        Bahan
                      </th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>
                        Berkurang
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockPreview.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid #f0f0ee' }}>
                        <td style={{ padding: '7px 8px', color: '#1a1a1a' }}>{item.product_name}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--color-danger)', fontWeight: '500' }}>
                          -{item.total_reduction.toFixed(2)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tombol import */}
              <button
                onClick={handleSync}
                disabled={loading}
                style={{
                  marginTop: '20px', width: '100%',
                  padding: '12px', borderRadius: '8px', border: 'none',
                  background: '#2D7A4F', color: 'white',
                  fontSize: '13px', fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Memproses...' : 'Import & Update Stok'}
              </button>

              <button
                onClick={() => { setPreview([]); setStockPreview([]); setPendingRows([]) }}
                style={{
                  marginTop: '8px', width: '100%',
                  padding: '10px', borderRadius: '8px',
                  border: '0.5px solid #d0d0cc', background: 'white',
                  color: '#666', fontSize: '13px', fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Hasil sync */}
        {result.length > 0 && synced && (
          <div style={{
            background: 'white', borderRadius: '12px',
            padding: '24px', border: '0.5px solid #e0e0dc',
          }}>
            <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px' }}>
              Hasil Import
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {result.map((log, i) => (
                <li key={i} style={{
                  fontSize: '13px', color: '#444',
                  padding: '6px 0',
                  borderBottom: i < result.length - 1 ? '0.5px solid #f0f0ee' : 'none',
                }}>
                  {log}
                </li>
              ))}
            </ul>

            <button
              onClick={() => { setResult([]); setSynced(false); setPendingRows([]) }}
              style={{
                marginTop: '16px', padding: '10px 20px',
                borderRadius: '8px', border: '0.5px solid #d0d0cc',
                background: 'white', color: '#444',
                fontSize: '13px', fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Upload File Baru
            </button>
          </div>
        )}

      </div>
    </div>
  )
}