import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { generateProductMetadata, ProductSchema, BreadcrumbSchema } from '@/components/seo'
import ProductPageClient from './ProductPageClient'
import { SITE_URL } from '@/lib/site-url'

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

    const [{ data: related }, { data: marketingTagRows }] = await Promise.all([
      db.from('products')
        .select('id, name, slug, images, image_url, display_price, price')
        .eq('is_active', true)
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4),
      db.from('product_marketing_categories')
        .select('marketing_categories(label, slug)')
        .eq('product_id', product.id),
    ])
    return { product, related: related || [], marketingTagRows: marketingTagRows || [] }
  } catch (e) {
    console.error('[product-page]', slug, e)
    return null
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const loaded = await loadProduct(params.slug)
  if (!loaded) notFound()
  const { product, related, marketingTagRows } = loaded

  const marketingTags: { label: string; slug: string }[] = (marketingTagRows || []).flatMap((row: any) =>
    row.marketing_categories ? [{ label: row.marketing_categories.label, slug: row.marketing_categories.slug }] : []
  )

  const faqs: { question: string; answer: string }[] =
    Array.isArray(product.faq) ? product.faq : []

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    ...(product.category
      ? [{ name: product.category, href: `/shop?cat=${encodeURIComponent(product.category)}` }]
      : []),
    { name: product.name },
  ]

  const pageUrl = `${SITE_URL}/products/${product.slug}`

  return (
    <>
      <ProductSchema product={product} url={pageUrl} />
      <BreadcrumbSchema items={breadcrumbs.filter(b => b.href).map(b => ({ name: b.name, url: b.href! }))} />
      <ProductPageClient
        product={product}
        relatedProducts={related}
        faqs={faqs}
        breadcrumbs={breadcrumbs}
        marketingTags={marketingTags}
      />
    </>
  )
}
