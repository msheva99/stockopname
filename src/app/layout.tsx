import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stok Mitra - Inventory Management',
  description: 'Sistem inventory multi-outlet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}