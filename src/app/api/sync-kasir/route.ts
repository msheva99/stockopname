import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const OUTLET_ID = 1

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()
    const logs: string[] = []

    for (const row of rows) {
      const menuName = row['Nama']?.trim()
      const qty = Number(row['Jumlah Barang'])

      if (!menuName || !qty) continue

      const { data: recipes } = await supabase
        .from('recipes')
        .select('product_id, quantity, unit')
        .eq('menu_name', menuName)

      if (!recipes || recipes.length === 0) {
        logs.push(`${menuName}: tidak ada resep, dilewati`)
        continue
      }

      for (const recipe of recipes) {
        const totalUsed = recipe.quantity * qty

        const { error: updateError } = await supabase.rpc('exec_write_sql', {
          query: `UPDATE outlet_stock SET current_qty = current_qty - ${totalUsed} WHERE outlet_id = ${OUTLET_ID} AND product_id = ${recipe.product_id}`
        })

        if (updateError) {
          logs.push(`${menuName} - product_id ${recipe.product_id}: ${updateError.message}`)
        }
      }

      logs.push(`${menuName} x${qty}: stok diupdate`)
    }

    return NextResponse.json({ success: true, logs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}