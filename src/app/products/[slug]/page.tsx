import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { generateProductMetadata, ProductSchema, BreadcrumbSchema } from '@/components/seo'
import ProductPageClient from './ProductPageClient'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://printhub.cchumedia.com'

// Use the service role key for server-side fetches; fall back to the anon key.
// Both are read at REQUEST time so they work on Vercel serverless functions.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

function serverClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { title: 'PrintHub — Print Products' }
  const { data } = await serverClient()
    .from('products')
    .select('name, seo_title, meta_description, slug, images, image_url, short_description')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!data) return { title: 'Product Not Found | PrintHub' }
  return generateProductMetadata(data)
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) notFound()

  const db = serverClient()

  const { data: product, error } = await db
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  // Temporary diagnostic log — visible in Vercel function logs
  console.log('[product-page] design_pricing_type for', params.slug, '=', (product as any)?.design_pricing_type)

  // PGRST116 = no rows found; any other error is unexpected — log but still 404
  if (error || !product) {
    if (error && error.code !== 'PGRST116') console.error('[product-page]', params.slug, error.code, error.message)
    notFound()
  }

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
        relatedProducts={related || []}
        faqs={faqs}
        breadcrumbs={breadcrumbs}
        marketingTags={marketingTags}
      />
    </>
  )
}
