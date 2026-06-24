'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function SyncPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult([])
    setError('')

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet)

      // Filter baris valid (punya Nama dan Jumlah Barang, bukan Total Semua)
      const validRows = rows.filter(
        r => r['Nama'] && r['Jumlah Barang'] && r['Nama'] !== 'Total Semua'
      )

      const res = await fetch('/api/sync-kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })

      const data = await res.json()
      if (data.success) {
        setResult(data.logs)
      } else {
        setError(data.error || 'Terjadi kesalahan')
      }
    } catch (err) {
      setError('Gagal membaca file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sync Kasir Pintar</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <p className="text-gray-600 mb-4">
          Upload file laporan penjualan dari Kasir Pintar (.xls) untuk update stok otomatis.
        </p>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFile}
          disabled={loading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
        />
      </div>

      {loading && (
        <div className="text-center text-gray-500">Memproses file...</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4">{error}</div>
      )}

      {result.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-3">Hasil Sync:</h2>
          <ul className="space-y-1">
            {result.map((log, i) => (
              <li key={i} className="text-sm text-gray-700">
                {log}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}