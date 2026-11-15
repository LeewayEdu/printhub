import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { generateProductMetadata, ProductSchema, BreadcrumbSchema, type ShippingRange } from '@/components/seo'
import ProductPageClient from './ProductPageClient'
import { SITE_URL } from '@/lib/site-url'
import { withFromPrices } from '@/lib/pricing-server'

export const dynamic = 'force-dynamic'


// Use the service role key for server-side fetches; fall back to the anon key.
// Both are read at REQUEST time so they work on Vercel serverless functions.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

function serverClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { title: 'Print Products' }
  try {
    const { data } = await serverClient()
      .from('products')
      .select('name, seo_title, meta_description, slug, images, image_url, short_description')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .maybeSingle()
    if (!data) return { title: 'Product not found' }
    return generateProductMetadata(data)
  } catch (e) {
    console.error('[product-metadata]', params.slug, e)
    return { title: 'Product not found' }
  }
}

// All data for the page. Any failure resolves to null so the caller can 404
// instead of throwing a 500.
async function loadProduct(slug: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const db = serverClient()
    const { data: product, error } = await db
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) console.error('[product-page]', slug, error.code, error.message)
    if (error || !product) return null

    const [{ data: related }, { data: marketingTagRows }, { data: categoryRow }, { data: deliveryRows }, { data: reviewRows }] = await Promise.all([
      db.from('products')
        .select('id, name, slug, images, image_url, display_price, price, product_type, category, moq, min_width, min_height, min_order_amount, is_fixed_price')
        .eq('is_active', true)
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4),
      db.from('product_marketing_categories')
        .select('marketing_categories(label, slug)')
        .eq('product_id', product.id),
      // Real category record for this product's type (label + slug for the /categories page)
      db.from('categories').select('label, slug').eq('slug', product.product_type ?? '').eq('is_active', true).maybeSingle(),
      // Active delivery fees (excluding free pickup) give the shipping cost range
      db.from('delivery_settings').select('price, type').eq('is_active', true).neq('type', 'pickup'),
      // Only approved reviews count as real
      db.from('product_reviews').select('rating').eq('product_id', product.id).eq('is_approved', true),
    ])
    const fees = (deliveryRows || []).map((r: any) => Number(r.price)).filter((n: number) => n > 0)
    const shipping: ShippingRange = fees.length ? { min: Math.min(...fees), max: Math.max(...fees) } : null
    const ratings = (reviewRows || []).map((r: any) => Number(r.rating)).filter((n: number) => n >= 1 && n <= 5)
    const reviewStats = ratings.length
      ? { count: ratings.length, average: Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 }
      : null
    // The page's own "from" price and its related products' prices use the shared function
    const [pricedProduct] = await withFromPrices([product])
    const pricedRelated = await withFromPrices(related || [])
    return { product: pricedProduct, related: pricedRelated, marketingTagRows: marketingTagRows || [], category: categoryRow, shipping, reviewStats }
  } catch (e) {
    console.error('[product-page]', slug, e)
    return null
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const loaded = await loadProduct(params.slug)
  if (!loaded) notFound()
  const { product, related, marketingTagRows, category, shipping, reviewStats } = loaded

  const marketingTags: { label: string; slug: string }[] = (marketingTagRows || []).flatMap((row: any) =>
    row.marketing_categories ? [{ label: row.marketing_categories.label, slug: row.marketing_categories.slug }] : []
  )

  const faqs: { question: string; answer: string }[] =
    Array.isArray(product.faq) ? product.faq : []

  // Breadcrumb category: prefer the customer-facing marketing category, then the
  // real category record for the product type, then the stored category name.
  const crumbCategory = marketingTags[0]
    ? { name: marketingTags[0].label, href: `${SITE_URL}/shop?cat=${encodeURIComponent(marketingTags[0].label)}` }
    : category
      ? { name: category.label as string, href: `${SITE_URL}/categories/${category.slug}` }
      : product.category
        ? { name: product.category as string, href: `${SITE_URL}/shop` }
        : null

  const pageUrl = `${SITE_URL}/products/${product.slug}`

  const breadcrumbs: { name: string; href?: string }[] = [
    { name: 'Home', href: SITE_URL },
    { name: 'Shop', href: `${SITE_URL}/shop` },
    ...(crumbCategory ? [crumbCategory] : []),
    { name: product.name },
  ]

  return (
    <>
      <ProductSchema product={product} url={pageUrl} shipping={shipping} sku={product.id} reviewStats={reviewStats} />
      <BreadcrumbSchema items={breadcrumbs.map(b => ({ name: b.name, url: b.href ?? pageUrl }))} />
      <ProductPageClient
        product={product}
        relatedProducts={related}
        faqs={faqs}
        breadcrumbs={breadcrumbs}
        marketingTags={marketingTags}
        reviewStats={reviewStats}
      />
    </>
  )
}
