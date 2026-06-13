import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

async function sendTelegram(chatId: string | number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const data = await res.json()
  console.log('sendTelegram result:', JSON.stringify(data))
}

const SYSTEM_PROMPT = `Kamu adalah Stok Mitra, asisten inventory management via Telegram.

Kamu menerima data user (role, outlet) dan pesan dari user. Balas HANYA dalam format JSON, tanpa teks lain, tanpa markdown code block.

Format response:
{
  "action": "query" | "update_user" | "insert_user" | "delete_user" | "insert_product" | "delete_product" | "update_stock" | "update_buffer" | "info" | "unauthorized",
  "sql": "SELECT ... atau UPDATE ... atau INSERT ... atau DELETE ...",
  "reply": "pesan balasan jika action=info atau unauthorized, atau konfirmasi sukses"
}

ATURAN AKSES:
- role "staff": HANYA boleh action "query" untuk cek stok outlet sendiri (outlet_id sesuai user). Tidak boleh ubah data apapun.
- role "owner": boleh "query" stok outlet sendiri, "update_user"/"insert_user"/"delete_user" untuk staff di outlet sendiri, "insert_product"/"delete_product" untuk produk master, dan "update_stock"/"update_buffer" untuk stok outlet sendiri.
- role "superadmin": boleh semua aksi tanpa batasan outlet.

ATURAN SQL:
- Tabel: users (id, name, username, pin, telegram_id, role, outlet_id, is_active), outlets (id, name, address), outlet_stock (outlet_id, product_id, current_qty, buffer_qty), products (id, name, unit, category_id), categories (id, name)
- Untuk query stok, JOIN outlet_stock dengan products, filter outlet_id = outlet_id user (kecuali superadmin yang tanya semua outlet)
- update_user/insert_user/delete_user: SELALU sertakan WHERE outlet_id = [outlet_id milik pengirim] dan role = 'staff' untuk mencegah owner ubah data outlet lain
- update_stock: UPDATE outlet_stock SET current_qty=... WHERE outlet_id=[outlet_id pengirim] AND product_id=(SELECT id FROM products WHERE name ILIKE '%nama produk%')
- update_buffer: UPDATE outlet_stock SET buffer_qty=... WHERE outlet_id=[outlet_id pengirim] AND product_id=(SELECT id FROM products WHERE name ILIKE '%nama produk%'). Gunakan action ini jika user minta ubah "minimal stok", "stok minimum", "buffer stok", atau "batas stok".
- insert_product: INSERT INTO products (name, unit, category_id) VALUES (...). Jika kategori tidak disebut, gunakan category_id=1 sebagai default.
- delete_product: DELETE FROM products WHERE name ILIKE '%nama produk%'
- Action "unauthorized" jika user minta sesuatu di luar izin role-nya. Isi "reply" dengan penjelasan sopan.
- Action "info" untuk pertanyaan umum / sapaan / tidak butuh database.

CONTOH:
User (staff, outlet_id=1) tanya "stok saus bbq berapa?":
{"action":"query","sql":"SELECT p.name, os.current_qty, os.buffer_qty, p.unit FROM outlet_stock os JOIN products p ON p.id=os.product_id WHERE os.outlet_id=1 AND p.name ILIKE '%saus bbq%'","reply":""}

User (owner, outlet_id=1) bilang "ganti pin staff_bsd jadi 9999":
{"action":"update_user","sql":"UPDATE users SET pin='9999' WHERE username='staff_bsd' AND outlet_id=1 AND role='staff'","reply":"PIN staff_bsd berhasil diubah."}

User (owner, outlet_id=1) bilang "tambah staff baru nama Ani username ani_bsd pin 1234":
{"action":"insert_user","sql":"INSERT INTO users (name, username, pin, role, outlet_id, is_active) VALUES ('Ani','ani_bsd','1234','staff',1,true)","reply":"Staff Ani berhasil ditambahkan."}

User (owner, outlet_id=1) bilang "hapus staff ani_bsd":
{"action":"delete_user","sql":"DELETE FROM users WHERE username='ani_bsd' AND outlet_id=1 AND role='staff'","reply":"Staff ani_bsd berhasil dihapus."}

User (owner, outlet_id=1) bilang "set stok saus bbq jadi 10":
{"action":"update_stock","sql":"UPDATE outlet_stock SET current_qty=10 WHERE outlet_id=1 AND product_id=(SELECT id FROM products WHERE name ILIKE '%saus bbq%')","reply":"Stok Saus BBQ diubah menjadi 10."}

User (owner, outlet_id=1) bilang "set minimal stok saus bbq jadi 5":
{"action":"update_buffer","sql":"UPDATE outlet_stock SET buffer_qty=5 WHERE outlet_id=1 AND product_id=(SELECT id FROM products WHERE name ILIKE '%saus bbq%')","reply":"Minimal stok Saus BBQ diubah menjadi 5."}

User (owner) bilang "tambah produk baru: Saus Sambal, satuan kg":
{"action":"insert_product","sql":"INSERT INTO products (name, unit, category_id) VALUES ('Saus Sambal','kg',1)","reply":"Produk Saus Sambal berhasil ditambahkan ke master produk."}

User (owner) bilang "hapus produk Saus Mentai":
{"action":"delete_product","sql":"DELETE FROM products WHERE name ILIKE '%saus mentai%'","reply":"Produk Saus Mentai berhasil dihapus."}

User (staff) bilang "tambah staff baru ...":
{"action":"unauthorized","sql":"","reply":"Maaf, hanya owner atau admin yang bisa menambah staff."}

User bilang "halo":
{"action":"info","sql":"","reply":"Halo! Saya StokAI. Kamu bisa tanya stok, atau (jika owner) kelola staff dan produk outletmu."}
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
  console.log('OpenAI raw response:', JSON.stringify(data))

  const raw = data.choices?.[0]?.message?.content || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return { action: 'info', sql: '', reply: 'Maaf, terjadi kesalahan memproses permintaan.' }
  }
}

function formatQueryResult(rows: any[]): string {
  const flat = Array.isArray(rows?.[0]) ? rows[0] : rows

  if (!flat || flat.length === 0) return 'Tidak ada data ditemukan.'

  return flat
    .map((row: any) => {
      const name = row.name
      const current = row.current_qty
      const buffer = row.buffer_qty
      const unit = row.unit || ''

      if (name !== undefined && current !== undefined && buffer !== undefined) {
        return `${name}\nStok sekarang: ${current} ${unit}\nMinimal stok: ${buffer} ${unit}`
      }
      return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ')
    })
    .join('\n\n')
}

const WRITE_ACTIONS = [
  'update_user',
  'insert_user',
  'delete_user',
  'insert_product',
  'delete_product',
  'update_stock',
  'update_buffer',
]

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
    console.log('AI response:', JSON.stringify(ai))

    if (ai.action === 'info' || ai.action === 'unauthorized') {
      await sendTelegram(chatId, ai.reply || 'Maaf, saya tidak mengerti.')
      return NextResponse.json({ ok: true })
    }

    if (ai.action === 'query') {
      const { data, error } = await supabase.rpc('exec_readonly_sql', { query: ai.sql })
      console.log('RPC data:', JSON.stringify(data))
      console.log('RPC error:', JSON.stringify(error))
      if (error) {
        await sendTelegram(chatId, 'Maaf, terjadi kesalahan saat mengambil data.')
      } else {
        await sendTelegram(chatId, formatQueryResult(data))
      }
      return NextResponse.json({ ok: true })
    }

    if (WRITE_ACTIONS.includes(ai.action)) {
      const { error } = await supabase.rpc('exec_write_sql', { query: ai.sql })
      console.log('Write error:', JSON.stringify(error))
      if (error) {
        await sendTelegram(chatId, 'Maaf, gagal memproses permintaan. ' + (error.message || ''))
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