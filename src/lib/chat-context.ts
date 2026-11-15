// Live facts for the chatbot, read from the same data the website uses and cached for
// five minutes per server instance. Nothing here is typed in by hand: product prices come
// from the shared "from" price function, discounts from the qty_tiers table, delivery
// fees from delivery_settings, and loyalty/affiliate figures from lib/constants.

import { createClient } from '@supabase/supabase-js'
import { withFromPrices } from '@/lib/pricing-server'
import { SITE_URL } from '@/lib/site-url'
import { LOYALTY, AFFILIATE_MIN_PAYOUT } from '@/lib/constants'

export interface ChatContext {
  products: string
  tiers: string
  delivery: string
  loyalty: string
  live: boolean   // false when the database could not be read
}

const TTL = 5 * 60 * 1000
let cache: { at: number; ctx: ChatContext } | null = null

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

export function loyaltyText(): string {
  return [
    `Customers earn ${Math.round(LOYALTY.earnRate * 100)}% of every order value as loyalty points when the order is delivered.`,
    `1 point = ${naira(LOYALTY.redeemRate)}. Points are redeemed at checkout, from a minimum of ${LOYALTY.minRedeem} points (${naira(LOYALTY.minRedeem * LOYALTY.redeemRate)}).`,
    `Affiliates can request a payout from ${naira(AFFILIATE_MIN_PAYOUT)}.`,
  ].join('\n')
}

export async function getChatContext(): Promise<ChatContext> {
  if (cache && Date.now() - cache.at < TTL) return cache.ctx
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const unavailable: ChatContext = { products: '', tiers: '', delivery: '', loyalty: loyaltyText(), live: false }
  if (!url || !key) return cache?.ctx ?? unavailable

  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const [products, tiers, delivery, cats] = await Promise.all([
      db.from('products').select('name, slug, product_type, category, moq, is_fixed_price, display_price, price, min_width, min_height, min_order_amount, turnaround_time').eq('is_active', true).order('name'),
      db.from('qty_tiers').select('category, min_qty, max_qty, discount_pct').order('min_qty'),
      db.from('delivery_settings').select('type, name, price').eq('is_active', true).order('sort_order'),
      db.from('categories').select('slug, label'),
    ])
    if (products.error || !products.data) return cache?.ctx ?? unavailable

    const priced = await withFromPrices(products.data)
    const productLines = priced.map((p: any) => {
      const price = Number(p.display_price || p.price) || 0
      const link = `${SITE_URL}/products/${p.slug}`
      const min = p.moq && p.moq > 1 ? `, minimum order ${p.moq} pcs` : ''
      const name = String(p.name).trim()
      const time = p.turnaround_time ? `, turnaround ${p.turnaround_time}` : ''
      if (!price) return `- ${name}: no live price, send to WhatsApp for a quote (${link})`
      return p.is_fixed_price
        ? `- ${name}: fixed price ${naira(price)}${min}${time} (${link})`
        : `- ${name}: from ${naira(price)}${min ? ` for the minimum order${min.replace(', minimum order', ' of')}` : ''}${time}; options change the price (${link})`
    }).join('\n')

    const labelBySlug = Object.fromEntries((cats.data || []).map((c: any) => [c.slug, c.label]))
    // Only categories that active products actually use, and no duplicate rows
    const liveCategories = new Set(products.data.map((p: any) => p.product_type || p.category))
    const byCat: Record<string, string[]> = {}
    for (const t of tiers.data || []) {
      if (!liveCategories.has(t.category) || !(Number(t.discount_pct) > 0)) continue
      const row = `${t.min_qty}+ pcs: ${t.discount_pct}% off`
      const list = (byCat[t.category] ||= [])
      if (!list.includes(row)) list.push(row)
    }
    const tierLines = Object.entries(byCat).map(([c, rows]) => `- ${labelBySlug[c] || c}: ${rows.join(', ')}`).join('\n')

    const rows = delivery.data || []
    const pickup = rows.filter((r: any) => r.type === 'pickup')
    const paid = rows.filter((r: any) => r.type !== 'pickup' && Number(r.price) > 0)
    const group = (type: string, title: string) => {
      const list = paid.filter((r: any) => r.type === type)
      return list.length ? `${title}: ${list.map((r: any) => `${r.name} ${naira(Number(r.price))}`).join(', ')}` : ''
    }
    const deliveryText = [
      pickup.length ? `Free pickup: ${pickup.map((r: any) => r.name).join(', ')}` : '',
      group('local', 'Abuja delivery fees'),
      group('interstate', 'Interstate delivery fees by state'),
    ].filter(Boolean).join('\n')

    const ctx: ChatContext = { products: productLines, tiers: tierLines, delivery: deliveryText, loyalty: loyaltyText(), live: true }
    cache = { at: Date.now(), ctx }
    return ctx
  } catch {
    return cache?.ctx ?? unavailable
  }
}
