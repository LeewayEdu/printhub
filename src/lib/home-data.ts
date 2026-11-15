// Server-side data for the home page. Everything shown as a fact on the page
// (prices, counts, discounts, bestsellers) is derived here from the database.
// Uses the public anon key: the browser previously read these same tables with it.

import { createClient } from '@supabase/supabase-js'
import { HOME_SERVICES } from '@/lib/constants'
import { MIN_BESTSELLERS_TO_SHOW, isBestseller, visibleBadge } from '@/lib/catalog'
import { freshenYears } from '@/lib/company'
import { withFromPrices } from '@/lib/pricing-server'

export interface HomeData {
  heroBanners: any[]
  products: any[]
  testimonials: any[]
  tickerItems: { text: string; emoji: string }[]
  /** product_id -> marketing category labels */
  productTags: Record<string, string[]>
  /** marketing category label -> number of ACTIVE products (zero-count categories omitted) */
  categoryMap: Record<string, number>
  categoryIcons: Record<string, string>
  /** home service card name -> "From ₦X" or "Get a quote" */
  servicePrices: Record<string, string>
  /** cheapest active product price, or null */
  minPrice: number | null
  /** largest quantity discount (%) in the pricing tiers, or null */
  maxBulkDiscount: number | null
  featured: any[]
  bestsellers: any[]
}

const EMPTY: HomeData = {
  heroBanners: [], products: [], testimonials: [], tickerItems: [], productTags: {},
  categoryMap: {}, categoryIcons: {}, servicePrices: {}, minPrice: null, maxBulkDiscount: null,
  featured: [], bestsellers: [],
}

const priceOf = (p: any): number =>
  p.pricing_model === 'area' ? Number(p.area_rate) || 0 : Number(p.display_price || p.price) || 0

const fromLabel = (n: number | null) => (n ? `From ₦${n.toLocaleString('en-NG')}` : 'Get a quote')

export async function getHomeData(): Promise<HomeData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return EMPTY

  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const [banners, products, cats, tags, testimonials, ticker, tiers] = await Promise.all([
      db.from('hero_banners').select('*').eq('is_active', true).eq('page_type', 'home').order('sort_order'),
      db.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      db.from('marketing_categories').select('id, label, icon').eq('is_active', true).order('sort_order'),
      db.from('product_marketing_categories').select('product_id, marketing_categories(label)'),
      db.from('testimonials').select('*').eq('is_active', true).order('sort_order'),
      db.from('trust_ticker').select('text, emoji').eq('is_active', true).order('sort_order'),
      db.from('qty_tiers').select('discount_pct'),
    ])

    // Badges are resolved here so an unearned "Best Seller"/"New" never reaches the page
    const productList: any[] = (await withFromPrices(products.data || [])).map((p: any) => ({ ...p, badge: visibleBadge(p) }))
    const activeIds = new Set(productList.map(p => p.id))

    // Tags and counts only for active products
    const productTags: Record<string, string[]> = {}
    const counts: Record<string, number> = {}
    const icons: Record<string, string> = {}
    const pricesByLabel: Record<string, number[]> = {}
    const byId = new Map(productList.map(p => [p.id, p]))
    ;(cats.data || []).forEach((c: any) => { icons[c.label] = c.icon || '🏷️' })
    ;(tags.data || []).forEach((row: any) => {
      const label = row.marketing_categories?.label
      if (!label || !activeIds.has(row.product_id)) return
      ;(productTags[row.product_id] ||= []).push(label)
      counts[label] = (counts[label] || 0) + 1
      const price = priceOf(byId.get(row.product_id))
      if (price > 0) (pricesByLabel[label] ||= []).push(price)
    })

    // Keep the admin-defined category order, drop categories with no active products
    const categoryMap: Record<string, number> = {}
    ;(cats.data || []).forEach((c: any) => { if (counts[c.label] > 0) categoryMap[c.label] = counts[c.label] })

    // RULE for the "What we print" cards: a card shows "From ₦X" only when its marketing
    // category (HOME_SERVICES[].priceFrom) has at least one ACTIVE product with a price,
    // where X is the cheapest such price. Otherwise it shows "Get a quote". Every card
    // goes through this one path, so no card can show a hand-typed price.
    const servicePrices: Record<string, string> = {}
    HOME_SERVICES.forEach(s => {
      const prices = pricesByLabel[s.priceFrom] || []
      servicePrices[s.name] = fromLabel(prices.length ? Math.min(...prices) : null)
    })

    const allPrices = productList.map(priceOf).filter(n => n > 0)
    const tierPcts = (tiers.data || []).map((t: any) => Number(t.discount_pct)).filter((n: number) => n > 0)

    // Bestsellers: real sales only, best first. Hidden entirely below the minimum count.
    const qualifying = productList
      .filter(isBestseller)
      .sort((a, b) => (Number(b.total_orders) || 0) - (Number(a.total_orders) || 0))
    const bestsellers = qualifying.length >= MIN_BESTSELLERS_TO_SHOW ? qualifying.slice(0, 8) : []
    const bestIds = new Set(bestsellers.map(p => p.id))
    // Featured never repeats a bestseller
    const featured = productList.filter(p => p.featured && !bestIds.has(p.id)).slice(0, 8)

    return {
      heroBanners: banners.data || [],
      products: productList,
      testimonials: testimonials.data || [],
      tickerItems: (ticker.data || []).map((t: any) => ({ ...t, text: freshenYears(t.text) })),
      productTags,
      categoryMap,
      categoryIcons: icons,
      servicePrices,
      minPrice: allPrices.length ? Math.min(...allPrices) : null,
      maxBulkDiscount: tierPcts.length ? Math.max(...tierPcts) : null,
      featured,
      bestsellers,
    }
  } catch (e) {
    console.error('[home-data]', e)
    return EMPTY
  }
}

