import { createClient } from '@supabase/supabase-js'
import ShopPageClient, { Product } from './ShopPageClient'

// Server-rendered so crawlers (and curl) see full product names/prices in
// the initial HTML — this page was previously client-only and shipped an
// empty shell to search engines.
export const revalidate = 3600

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

function serverClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { cat?: string; search?: string }
}) {
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

  const productTags: Record<string, string[]> = {}
  ;(tagRows || []).forEach((row: any) => {
    const label = row.marketing_categories?.label
    if (!label) return
    if (!productTags[row.product_id]) productTags[row.product_id] = []
    productTags[row.product_id].push(label)
  })

  const catCounts: Record<string, number> = {}
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
      initialProducts={(products || []) as Product[]}
      heroBanners={heroBanners || []}
      marketingCategories={marketingCategories || []}
      productTags={productTags}
      catCounts={catCounts}
      catIcons={catIcons}
      initialCat={searchParams.cat || 'All Products'}
      initialSearch={searchParams.search || ''}
    />
  )
}
