import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

async function sendTelegram(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

const SYSTEM_PROMPT = `Kamu adalah StokAI, asisten inventory management via Telegram.

Kamu menerima data user (role, outlet) dan pesan dari user. Balas HANYA dalam format JSON, tanpa teks lain, tanpa markdown code block.

Format response:
{
  "action": "query" | "update_user" | "insert_user" | "info" | "unauthorized",
  "sql": "SELECT ... atau UPDATE ... atau INSERT ...",
  "reply": "pesan balasan jika action=info atau unauthorized"
}

ATURAN AKSES:
- role "staff": HANYA boleh action "query" untuk cek stok outlet sendiri (outlet_id sesuai user). Tidak boleh ubah data apapun.
- role "owner": boleh "query" stok outlet sendiri, dan "update_user" / "insert_user" HANYA untuk staff di outlet_id miliknya sendiri (role harus 'staff').
- role "superadmin": boleh semua, termasuk tambah/edit owner, staff, outlet, produk.

ATURAN SQL:
- Tabel: users (id, name, username, pin, telegram_id, role, outlet_id, is_active), outlets (id, name, address), outlet_stock (outlet_id, product_id, current_qty, buffer_qty), products (id, name, unit, category_id), categories (id, name)
- Untuk query stok, JOIN outlet_stock dengan products, filter outlet_id = outlet_id user (kecuali superadmin yang tanya semua outlet)
- Untuk update_user/insert_user, SELALU sertakan WHERE outlet_id = [outlet_id milik pengirim] dan role = 'staff' untuk mencegah owner ubah data outlet lain
- Action "unauthorized" jika user minta sesuatu di luar izin role-nya. Isi "reply" dengan penjelasan sopan.
- Action "info" untuk pertanyaan umum / sapaan / tidak butuh database.

CONTOH:
User (staff, outlet_id=1) tanya "stok saus bbq berapa?":
{"action":"query","sql":"SELECT p.name, os.current_qty, os.buffer_qty, p.unit FROM outlet_stock os JOIN products p ON p.id=os.product_id WHERE os.outlet_id=1 AND p.name ILIKE '%saus bbq%'","reply":""}

User (owner, outlet_id=1) bilang "ganti pin staff_bsd jadi 9999":
{"action":"update_user","sql":"UPDATE users SET pin='9999' WHERE username='staff_bsd' AND outlet_id=1 AND role='staff'","reply":"PIN staff_bsd berhasil diubah."}

User (owner, outlet_id=1) bilang "tambah staff baru nama Ani username ani_bsd pin 1234":
{"action":"insert_user","sql":"INSERT INTO users (name, username, pin, role, outlet_id, is_active) VALUES ('Ani','ani_bsd','1234','staff',1,true)","reply":"Staff Ani berhasil ditambahkan."}

User (staff) bilang "tambah staff baru ...":
{"action":"unauthorized","sql":"","reply":"Maaf, hanya owner atau admin yang bisa menambah staff."}

User bilang "halo":
{"action":"info","sql":"","reply":"Halo! Saya StokAI. Kamu bisa tanya stok, atau (jika owner) kelola staff outletmu."}
`

async function askOpenAI(userMessage: string, userContext: any) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Data user pengirim: ${JSON.stringify(userContext)}\n\nPesan: ${userMessage}`,
        },
      ],
    }),
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return { action: 'info', sql: '', reply: 'Maaf, terjadi kesalahan memproses permintaan.' }
  }
}

function formatQueryResult(rows: any[]): string {
  if (!rows || rows.length === 0) return 'Tidak ada data ditemukan.'
  return rows
    .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | '))
    .join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Body received:', JSON.stringify(body))
    const message = body?.message
    if (!message?.text) {
      console.log('No message text, skipping')
      return NextResponse.json({ ok: true })
    }
    
    const chatId = message.chat.id
    const telegramId = message.from.id.toString()
    const text = message.text.trim()

    const { data: user } = await supabase
      .from('users')
      .select('id, name, username, role, outlet_id, outlets(name)')
      .eq('telegram_id', telegramId)
      .eq('is_active', true)
      .single()

    console.log('User found:', JSON.stringify(user))

    if (!user) {
      console.log('User not found for telegramId:', telegramId)
      await sendTelegram(chatId, 'Maaf, akun Telegram Anda belum terdaftar di sistem. Hubungi admin perusahaan.')
      return NextResponse.json({ ok: true })
    }

    const userContext = {
      name: user.name,
      role: user.role,
      outlet_id: user.outlet_id,
      outlet_name: (user as any).outlets?.name || null,
    }

    const ai = await askOpenAI(text, userContext)

    if (ai.action === 'info' || ai.action === 'unauthorized') {
      await sendTelegram(chatId, ai.reply || 'Maaf, saya tidak mengerti.')
      return NextResponse.json({ ok: true })
    }

    if (ai.action === 'query') {
      const { data, error } = await supabase.rpc('exec_readonly_sql', { query: ai.sql })
      if (error) {
        await sendTelegram(chatId, 'Maaf, terjadi kesalahan saat mengambil data.')
      } else {
        await sendTelegram(chatId, formatQueryResult(data))
      }
      return NextResponse.json({ ok: true })
    }

    if (ai.action === 'update_user' || ai.action === 'insert_user') {
      const { error } = await supabase.rpc('exec_write_sql', { query: ai.sql })
      if (error) {
        await sendTelegram(chatId, 'Maaf, gagal memproses permintaan. Pastikan data sudah benar.')
      } else {
        await sendTelegram(chatId, ai.reply || 'Berhasil diproses.')
      }
      return NextResponse.json({ ok: true })
    }

  await sendTelegram(chatId, 'Maaf, saya tidak mengerti permintaan Anda.')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('ERROR:', err)
    return NextResponse.json({ ok: true })
  }
}