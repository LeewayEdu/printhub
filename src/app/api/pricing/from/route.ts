import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withFromPrices } from '@/lib/pricing-server'

// Public: current "From" price for every active product, from the shared pricing function. Lets
// client-rendered pages (starter kits, election campaign, book publishing) show the same price as
// the shop. Cached for 5 minutes.
export const revalidate = 300

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ prices: {} })
  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await db.from('products')
      .select('id, product_type, category, moq, min_width, min_height, min_order_amount, is_fixed_price, display_price, price')
      .eq('is_active', true)
    const priced = await withFromPrices(data || [])
    const prices: Record<string, number> = {}
    for (const p of priced as any[]) { const n = Number(p.display_price || p.price) || 0; if (n > 0) prices[p.id] = n }
    return NextResponse.json({ prices }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch {
    return NextResponse.json({ prices: {} })
  }
}
