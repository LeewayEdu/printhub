// Server-side price check for new orders. The browser sends the prices it calculated; none of them
// is trusted. Every cart line, the delivery fee, the promo discount and the total are recomputed here
// from the database, with the same calculate() the product page uses, and the order is rejected if a
// line differs by more than ₦1 (this stops tampered carts). The amounts stored on the order are the
// server's own.

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPricingData } from '@/lib/pricing-server'
import { recomputePrintTotal, fixedPriceTotal } from '@/lib/priceCalc'
import { priceBookLines, type BookCartLine, type PricedBookLine } from '@/lib/books/pricing'
import { usdEnabled, PRICE_TOLERANCE_USD } from '@/lib/books/currency'
import type { Currency } from '@/lib/books/types'

export const PRICE_TOLERANCE = 1   // ₦

export interface LineCheck { index: number; name: string; claimed: number; expected: number | null; problem?: string }
export type OrderPricing =
  | { ok: true; subtotal: number; deliveryFee: number; discount: number; total: number; delivery: any | null; linePrices: number[]; currency: Currency; bookLines: PricedBookLine[] }
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

export type DeliveryResolution =
  | { ok: true; delivery: any | null; fee: number }
  | { ok: false; error: 'invalid_delivery'; detail: string }

/**
 * Every order that contains a physical item (a printed product or a print book) must name a delivery option, and the fee
 * comes from the delivery table, never from the browser. Free pickup is one of the options (a row with price 0), so a
 * customer who wants no delivery still chooses it. An order with only digital items has nothing to deliver and ignores
 * any delivery option that was sent.
 */
export async function resolveDelivery(db: SupabaseClient, needsDelivery: boolean, deliveryId: unknown): Promise<DeliveryResolution> {
  if (!needsDelivery) return { ok: true, delivery: null, fee: 0 }
  if (!deliveryId) return { ok: false, error: 'invalid_delivery', detail: 'Please choose a delivery option. Free pickup is one of the choices.' }
  const { data: d } = await db.from('delivery_settings').select('*').eq('id', String(deliveryId)).eq('is_active', true).maybeSingle()
  if (!d) return { ok: false, error: 'invalid_delivery', detail: 'Delivery option not found' }
  return { ok: true, delivery: d, fee: Number(d.price) || 0 }
}

export async function priceOrder(db: SupabaseClient, body: any): Promise<OrderPricing> {
  const items: any[] = body.items
  const currency: Currency = body.currency === 'USD' ? 'USD' : 'NGN'
  // Product lines and book lines are priced separately; both keep their position in the cart
  const productEntries = items.map((it, index) => ({ it, index })).filter(x => x.it?.kind !== 'book')
  const bookEntries = items.map((it, index) => ({ it, index })).filter(x => x.it?.kind === 'book')
  if (currency === 'USD') {
    // USD is for ebooks only: no products, no delivery, no promo code, and only while the flag is on
    if (!usdEnabled() || productEntries.length > 0 || body.promoCode || body.deliveryId) {
      return { ok: false, error: 'currency_not_available', detail: 'USD is not available for this order' }
    }
  }
  // Printed products always need a delivery option. Checked first, before any price is loaded.
  if (productEntries.length > 0 && !body.deliveryId) {
    return { ok: false, error: 'invalid_delivery', detail: 'Please choose a delivery option. Free pickup is one of the choices.' }
  }
  const ids = Array.from(new Set(productEntries.map(x => String(x.it.productId))))
  let products: any[] = [], data: any = null, links: any[] = []
  if (productEntries.length > 0) {
    const [p, d, l] = await Promise.all([
      db.from('products').select('*').in('id', ids).eq('is_active', true),
      loadPricingData(true),
      db.from('product_design_addons').select('product_id, design_addons(name, price)').in('product_id', ids),
    ])
    if (!p.data || !d) return { ok: false, error: 'pricing_unavailable', detail: 'Could not load prices to verify the order' }
    products = p.data; data = d; links = l.data || []
  }
  const byId = Object.fromEntries(products.map((p: any) => [p.id, p]))
  const linkedByProduct: Record<string, Record<string, number>> = {}
  for (const l of (links || []) as any[]) {
    if (l.design_addons) (linkedByProduct[l.product_id] ||= {})[l.design_addons.name] = Number(l.design_addons.price) || 0
  }

  const lines: LineCheck[] = []
  let subtotal = 0
  let bad = false
  productEntries.forEach(({ it, index }) => {
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

  // Book lines: priced from book_formats only, in the order's currency
  let bookLines: PricedBookLine[] = []
  let bookPhysical = false
  if (bookEntries.length > 0) {
    const bp = await priceBookLines(db, bookEntries.map(({ it, index }): BookCartLine => ({
      index, bookFormatId: String(it.bookFormatId || ''), quantity: Number(it.quantity ?? 1), claimed: Number(it.price), name: it.name,
    })), currency, usdEnabled())
    if (!bp.ok) return { ok: false, error: bp.error, detail: bp.detail }
    bookLines = bp.lines
    bookPhysical = bp.hasPhysical
    subtotal = Math.round((subtotal + bp.total) * 100) / 100
  }
  const needsDelivery = productEntries.length > 0 || bookPhysical

  // Delivery fee comes from the delivery table, never from the browser
  const dres = await resolveDelivery(db, needsDelivery, body.deliveryId)
  if (!dres.ok) return dres
  const delivery = dres.delivery
  const deliveryFee = dres.fee

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

  const total = Math.round((subtotal + deliveryFee - discount) * 100) / 100
  const tol = currency === 'USD' ? PRICE_TOLERANCE_USD : PRICE_TOLERANCE
  if (Math.abs(Number(body.total) - total) > tol) {
    return { ok: false, error: 'price_mismatch', detail: `total ${body.total} vs ${total}` }
  }
  // Prices stay aligned with the cart order: product lines from the loop above, book lines from the book check
  const linePrices: number[] = new Array(items.length).fill(0)
  lines.forEach(l => { linePrices[l.index] = l.expected as number })
  bookLines.forEach(b => { linePrices[b.index] = b.total })
  return { ok: true, subtotal, deliveryFee, discount, total, delivery, linePrices, currency, bookLines }
}
