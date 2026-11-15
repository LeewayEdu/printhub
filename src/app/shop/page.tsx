import { createClient } from '@supabase/supabase-js'
import ShopPageClient, { Product } from './ShopPageClient'

// Server-rendered so crawlers (and curl) see full product names/prices in
// the initial HTML — this page was previously client-only and shipped an
// empty shell to search engines.
// Static page rebuilt at most every 5 minutes (filters are applied in the browser from ?cat=)
export const revalidate = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

function serverClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Only what the product cards and filters need (the full database row is ~10x larger)
const CARD_FIELDS = [
  'id', 'name', 'slug', 'category', 'product_type', 'pricing_model', 'price', 'display_price', 'is_fixed_price',
  'area_rate', 'area_unit', 'images', 'image_url', 'badge', 'featured', 'discount_type', 'discount_value',
  'rating', 'review_count', 'total_orders', 'is_active', 'moq', 'created_at', 'sort_order',
]

export default async function ShopPage() {
  const db = serverClient()

  const [
    { data: products },
    { data: heroBanners },
    { data: marketingCategories },
    { data: tagRows },
  ] = await Promise.all([
    db.from('products').select('*').eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    db.from('hero_banners').select('*').eq('is_active', true).order('sort_order'),
    db.from('marketing_categories').select('id, label, slug, icon').eq('is_active', true).order('sort_order'),
    db.from('product_marketing_categories').select('product_id, marketing_categories(label)'),
  ])

  // Price model of each product's category (e.g. per_100) so cards can show a per-piece price
  const { data: catRows } = await db.from('categories').select('slug, price_model')
  const modelBySlug = Object.fromEntries((catRows || []).map((c: any) => [c.slug, c.price_model]))

  const slim = (products || []).map((p: any) => {
    const o: Record<string, unknown> = {}
    CARD_FIELDS.forEach(k => { o[k] = p[k] })
    o.price_model = modelBySlug[p.product_type] ?? null
    // descriptions are only used for search, so a short excerpt is enough
    o.description = typeof p.description === 'string' ? p.description.slice(0, 200) : null
    return o
  })

  const productTags: Record<string, string[]> = {}
  ;(tagRows || []).forEach((row: any) => {
    const label = row.marketing_categories?.label
    if (!label) return
    if (!productTags[row.product_id]) productTags[row.product_id] = []
    productTags[row.product_id].push(label)
  })

  // 'All Products' is the real number of active products (not the sum of tag counts)
  const catCounts: Record<string, number> = { 'All Products': (products || []).length }
  const catIcons: Record<string, string> = {}
  ;(marketingCategories || []).forEach((mc: any) => {
    catCounts[mc.label] = 0
    catIcons[mc.label] = mc.icon || '🏷️'
  })
  ;(products || []).forEach((p: any) => {
    (productTags[p.id] || []).forEach(label => {
      if (catCounts[label] !== undefined) catCounts[label]++
    })
  })

  return (
    <ShopPageClient
      initialProducts={slim as unknown as Product[]}
      heroBanners={heroBanners || []}
      marketingCategories={marketingCategories || []}
      productTags={productTags}
      catCounts={catCounts}
      catIcons={catIcons}
      initialCat="All Products"
      initialSearch=""
    />
  )
}
