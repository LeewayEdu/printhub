// Server-side price check for new orders. The browser sends the prices it calculated; none of them
// is trusted. Every cart line, the delivery fee, the promo discount and the total are recomputed here
// from the database, with the same calculate() the product page uses, and the order is rejected if a
// line differs by more than ₦1 (this stops tampered carts). The amounts stored on the order are the
// server's own.

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPricingData } from '@/lib/pricing-server'
import { recomputePrintTotal, fixedPriceTotal } from '@/lib/priceCalc'

export const PRICE_TOLERANCE = 1   // ₦

export interface LineCheck { index: number; name: string; claimed: number; expected: number | null; problem?: string }
export type OrderPricing =
  | { ok: true; subtotal: number; deliveryFee: number; discount: number; total: number; delivery: any | null; linePrices: number[] }
  | { ok: false; error: string; lines?: LineCheck[]; detail?: string }

function designCost(product: any, dp: any, linked: Record<string, number>): number | { error: string } {
  if (!dp || dp.hasOwnDesign) return 0
  switch (product.design_pricing_type) {
    case 'flat': return Number(product.design_flat_fee) || 0
    case 'unit_based': {
      const min = Number(product.design_min_units) || 1
      return (Number(product.design_unit_rate) || 0) * Math.max(Number(dp.designUnits) || 0, min)
    }
    case 'dependent': {
      let sum = Number(product.design_flat_fee) || 0
      for (const a of dp.designAddons || []) {
        if (!(a.name in linked)) return { error: `design add-on "${a.name}" is not offered for this product` }
        sum += linked[a.name]
      }
      return sum
    }
    default: return 0
  }
}

export async function priceOrder(db: SupabaseClient, body: any): Promise<OrderPricing> {
  const items: any[] = body.items
  const ids = Array.from(new Set(items.map(i => String(i.productId))))
  const [{ data: products }, data, { data: links }] = await Promise.all([
    db.from('products').select('*').in('id', ids).eq('is_active', true),
    loadPricingData(true),
    db.from('product_design_addons').select('product_id, design_addons(name, price)').in('product_id', ids),
  ])
  if (!products || !data) return { ok: false, error: 'pricing_unavailable', detail: 'Could not load prices to verify the order' }
  const byId = Object.fromEntries(products.map((p: any) => [p.id, p]))
  const linkedByProduct: Record<string, Record<string, number>> = {}
  for (const l of (links || []) as any[]) {
    if (l.design_addons) (linkedByProduct[l.product_id] ||= {})[l.design_addons.name] = Number(l.design_addons.price) || 0
  }

  const lines: LineCheck[] = []
  let subtotal = 0
  let bad = false
  items.forEach((it, index) => {
    const p = byId[String(it.productId)]
    const claimed = Number(it.price)
    if (!p) { lines.push({ index, name: String(it.name), claimed, expected: null, problem: 'product not found or inactive' }); bad = true; return }

    const qty = Number(String(it.specs?.Quantity ?? '1').replace(/[^\d.]/g, '')) || 1
    let print: number
    if (p.is_fixed_price) {
      print = fixedPriceTotal(p, qty)
    } else {
      const category = p.product_type || p.category
      const r = recomputePrintTotal({
        category, priceModel: data.models[category] || 'unit', groups: data.groups[category] || {}, addons: data.addons[category] || [],
        tiers: data.tiers[category] || [], minWidth: p.min_width, minHeight: p.min_height, minOrderAmount: p.min_order_amount,
        specs: (it.specs && typeof it.specs === 'object') ? it.specs : {},
      })
      if ('error' in r) { lines.push({ index, name: p.name, claimed, expected: null, problem: r.error }); bad = true; return }
      print = r.total
    }
    const design = designCost(p, it.designPricing, linkedByProduct[p.id] || {})
    if (typeof design === 'object') { lines.push({ index, name: p.name, claimed, expected: null, problem: design.error }); bad = true; return }
    const expected = print + design
    const line: LineCheck = { index, name: p.name, claimed, expected }
    if (!Number.isFinite(claimed) || Math.abs(claimed - expected) > PRICE_TOLERANCE) { line.problem = 'price differs from the current price'; bad = true }
    lines.push(line)
    subtotal += expected
  })
  if (bad) return { ok: false, error: 'price_mismatch', lines }

  // Delivery fee comes from the delivery table, never from the browser
  let deliveryFee = 0
  let delivery: any = null
  if (body.deliveryId) {
    const { data: d } = await db.from('delivery_settings').select('*').eq('id', String(body.deliveryId)).eq('is_active', true).maybeSingle()
    if (!d) return { ok: false, error: 'invalid_delivery', detail: 'Delivery option not found' }
    delivery = d
    deliveryFee = Number(d.price) || 0
  }

  // Promo: same rules the checkout applies
  let discount = 0
  if (body.promoCode) {
    const { data: promo } = await db.from('promo_codes').select('*').eq('code', String(body.promoCode).trim().toUpperCase()).eq('is_active', true).maybeSingle()
    const valid = promo
      && !(promo.expires_at && new Date(promo.expires_at) < new Date())
      && !(promo.max_uses && promo.uses >= promo.max_uses)
      && !(promo.min_order && subtotal < promo.min_order)
    if (!valid) return { ok: false, error: 'invalid_promo', detail: 'Promo code is not valid' }
    discount = promo.type === 'percentage' ? Math.round(subtotal * promo.value / 100) : Number(promo.value) || 0
  }

  const total = subtotal + deliveryFee - discount
  if (Math.abs(Number(body.total) - total) > PRICE_TOLERANCE) {
    return { ok: false, error: 'price_mismatch', detail: `total ${body.total} vs ${total}` }
  }
  return { ok: true, subtotal, deliveryFee, discount, total, delivery, linePrices: lines.map(l => l.expected as number) }
}
