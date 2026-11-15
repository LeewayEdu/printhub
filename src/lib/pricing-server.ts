// Server-side "From ₦X" prices. Every server-rendered page (shop, home, category and
// industry pages, product page, schema, chatbot) gets its "from" price here, computed by
// the same calculate() that the product page runs in the browser (see priceCalc.ts), so a
// card can never promise a price the product page cannot deliver.
// Data is cached in memory for 5 minutes per server instance.

import { createClient } from '@supabase/supabase-js'
import { lowestConfigurationTotal, type SpecOption, type QtyTier } from './priceCalc'

interface PricingData {
  at: number
  groups: Record<string, Record<string, SpecOption[]>>  // category -> spec group -> options
  tiers: Record<string, QtyTier[]>
  models: Record<string, string>                        // category slug -> price model
}

const TTL = 5 * 60 * 1000
let cache: PricingData | null = null

export async function loadPricingData(): Promise<PricingData | null> {
  if (cache && Date.now() - cache.at < TTL) return cache
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return cache
  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const [specs, tiers, cats] = await Promise.all([
      db.from('spec_options').select('*').eq('is_active', true).order('sort_order'),
      db.from('qty_tiers').select('*').order('sort_order'),
      db.from('categories').select('slug, price_model'),
    ])
    if (specs.error || tiers.error) return cache
    const groups: PricingData['groups'] = {}
    for (const o of (specs.data || []) as SpecOption[]) {
      if (o.is_addon) continue
      ;((groups[o.category] ||= {})[o.spec_group] ||= []).push(o)
    }
    const tierMap: PricingData['tiers'] = {}
    for (const t of (tiers.data || []) as QtyTier[]) (tierMap[t.category] ||= []).push(t)
    const models = Object.fromEntries((cats.data || []).map((c: any) => [c.slug, c.price_model || 'unit']))
    cache = { at: Date.now(), groups, tiers: tierMap, models }
    return cache
  } catch {
    return cache
  }
}

type ProductLike = {
  product_type?: string | null; category?: string | null; moq?: number | null
  min_width?: number | null; min_height?: number | null; min_order_amount?: number | null
  is_fixed_price?: boolean | null; display_price?: number | null; price?: number | null
}

/** Lowest valid configuration price for a product, or 0 when it cannot be computed. */
export function fromPriceSync(p: ProductLike, data: PricingData | null): number {
  if (!data || p.is_fixed_price) return 0
  const category = p.product_type || p.category || ''
  const groups = data.groups[category]
  if (!groups) return 0
  return lowestConfigurationTotal({
    category, priceModel: data.models[category] || 'unit', groups, tiers: data.tiers[category] || [],
    moq: p.moq, minWidth: p.min_width, minHeight: p.min_height, minOrderAmount: p.min_order_amount,
  })
}

/** Returns the products with display_price replaced by the computed "from" price where one exists. */
export async function withFromPrices<T extends ProductLike>(products: T[]): Promise<T[]> {
  const data = await loadPricingData()
  return products.map(p => {
    const from = fromPriceSync(p, data)
    return from > 0 ? { ...p, display_price: from } : p
  })
}
