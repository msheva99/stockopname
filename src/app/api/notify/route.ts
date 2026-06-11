import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!

async function sendTelegram(chatId: string, message: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })
  const data = await res.json()
  console.log('Telegram response:', JSON.stringify(data))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { outlet_id, outlet_name, items, note, staff_name } = body

    console.log('BOT_TOKEN ada:', !!BOT_TOKEN)
    console.log('outlet_id:', outlet_id)

    const criticalItems = items.filter((i: any) => i.physical_qty < i.buffer_qty)
    const changedItems = items.filter((i: any) => i.physical_qty !== i.system_qty)

    let message = `*Laporan Stock Opname*\n`
    message += `Outlet: ${outlet_name}\n`
    message += `Staff: ${staff_name}\n`
    message += `${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `Total produk: ${items.length}\n`
    message += `Perubahan: ${changedItems.length}\n`

    if (criticalItems.length > 0) {
      message += `\n*Stok Kritis (${criticalItems.length} item):*\n`
      criticalItems.forEach((item: any) => {
        message += `- ${item.product_name}: ${item.physical_qty} ${item.unit} (min: ${item.buffer_qty})\n`
      })
    } else {
      message += `\nSemua stok aman\n`
    }

    if (changedItems.length > 0) {
      message += `\n*Perubahan stok:*\n`
      changedItems.forEach((item: any) => {
        const diff = item.physical_qty - item.system_qty
        message += `- ${item.product_name}: ${item.system_qty} → ${item.physical_qty} (${diff > 0 ? '+' : ''}${diff})\n`
      })
    }

    if (note) {
      message += `\nCatatan: ${note}\n`
    }

    const { data: owners } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('outlet_id', outlet_id)
      .eq('role', 'owner')
      .not('telegram_id', 'is', null)

    const { data: admins } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('role', 'superadmin')
      .not('telegram_id', 'is', null)

    console.log('owners:', JSON.stringify(owners))
    console.log('admins:', JSON.stringify(admins))

    const recipients = [...(owners || []), ...(admins || [])]
    await Promise.all(recipients.map(r => sendTelegram(r.telegram_id, message)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}