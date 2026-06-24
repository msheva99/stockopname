import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()

    // Map: product_id -> total reduction
    const reductionMap: Record<number, number> = {}

    for (const row of rows) {
      const menuName = row['Nama']?.trim()
      const qty = Number(row['Jumlah Barang'])

      if (!menuName || !qty) continue

      const { data: recipes } = await supabase
        .from('recipes')
        .select('product_id, quantity')
        .eq('menu_name', menuName)

      if (!recipes || recipes.length === 0) continue

      for (const recipe of recipes) {
        const totalUsed = recipe.quantity * qty
        reductionMap[recipe.product_id] = (reductionMap[recipe.product_id] || 0) + totalUsed
      }
    }

    // Fetch nama produk
    const productIds = Object.keys(reductionMap).map(Number)

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, reductions: [] })
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, name, unit')
      .in('id', productIds)

    const reductions = (products || []).map(p => ({
      product_id: p.id,
      product_name: p.name,
      unit: p.unit,
      total_reduction: reductionMap[p.id] || 0,
    })).sort((a, b) => b.total_reduction - a.total_reduction)

    return NextResponse.json({ success: true, reductions })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}