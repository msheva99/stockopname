import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WUZAPI_URL = process.env.WUZAPI_URL!
const WUZAPI_TOKEN = process.env.WUZAPI_TOKEN!

async function sendWhatsApp(phone: string, message: string) {
  const res = await fetch(`${WUZAPI_URL}/chat/send/text?token=${WUZAPI_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Phone: phone, Body: message }),
  })
  const data = await res.json()
  console.log('Wuzapi response:', JSON.stringify(data))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { outlet_id, outlet_name, items, note, staff_name } = body

    const criticalItems = items.filter((i: any) => i.physical_qty < i.buffer_qty)
    const changedItems = items.filter((i: any) => i.physical_qty !== i.system_qty)

    const now = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    let message = `Laporan Stock Opname\n`
    message += `Outlet: ${outlet_name}\n`
    message += `Staff: ${staff_name}\n`
    message += `${now}\n\n`
    message += `Total produk: ${items.length}\n`
    message += `Perubahan: ${changedItems.length}\n`

    if (criticalItems.length > 0) {
      message += `\nStok Kritis (${criticalItems.length} item):\n`
      criticalItems.forEach((item: any) => {
        message += `- ${item.product_name}: ${item.physical_qty} ${item.unit} (min: ${item.buffer_qty})\n`
      })
    } else {
      message += `\nSemua stok aman\n`
    }

    if (changedItems.length > 0) {
      message += `\nPerubahan stok:\n`
      changedItems.forEach((item: any) => {
        const diff = item.physical_qty - item.system_qty
        message += `- ${item.product_name}: ${item.system_qty} > ${item.physical_qty} (${diff > 0 ? '+' : ''}${diff})\n`
      })
    }

    if (note) {
      message += `\nCatatan: ${note}\n`
    }

    const { data: owners } = await supabase
      .from('users')
      .select('phone')
      .eq('outlet_id', outlet_id)
      .eq('role', 'owner')
      .not('phone', 'is', null)

    const { data: admins } = await supabase
      .from('users')
      .select('phone')
      .eq('role', 'superadmin')
      .not('phone', 'is', null)

    const recipients = [...(owners || []), ...(admins || [])]
    await Promise.all(recipients.map(r => sendWhatsApp(r.phone, message)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}