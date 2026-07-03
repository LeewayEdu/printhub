// src/app/products/[slug]/page.tsx
// Individual product page — server-side rendered for SEO,
// with client-side calculator hydrated after initial load.

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductPageClient from './ProductPageClient'
import {
  generateProductMetadata,
  ProductSchema,
  FAQSchema,
  BreadcrumbSchema,
} from '@/components/seo'

const SITE_URL = 'https://printhub.cchumedia.com'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Static params for build-time SSG ────────────────────────
// Next.js pre-renders all active product pages at build time.
// Any new product added after build is caught by the fallback.
export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from('products')
    .select('slug')
    .eq('is_active', true)
    .not('slug', 'is', null)
  return (data || []).map(p => ({ slug: p.slug }))
}

// ── Dynamic metadata per product ────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { data: product } = await supabaseServer
    .from('products')
    .select('name, seo_title, meta_description, slug, images, image_url, short_description')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()
  if (!product) return { title: 'Product Not Found | PrintHub' }
  return generateProductMetadata(product)
}

// ── Server component — fetches product + related data ───────
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [{ data: product }, { data: relatedRaw }] = await Promise.all([
    supabaseServer
      .from('products')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single(),
    // Fetch spec options for the calculator
    supabaseServer
      .from('spec_options')
      .select('*')
      .order('spec_group')
      .order('sort_order'),
  ])

  if (!product) notFound()

  // Related products
  let relatedProducts: any[] = []
  if (product.related_product_ids?.length) {
    const { data } = await supabaseServer
      .from('products')
      .select('id, name, slug, display_price, price, images, image_url, badge, pricing_model, area_rate, area_unit')
      .in('id', product.related_product_ids)
      .eq('is_active', true)
    relatedProducts = data || []
  } else {
    // Fall back to products in the same category
    const { data } = await supabaseServer
      .from('products')
      .select('id, name, slug, display_price, price, images, image_url, badge, pricing_model, area_rate, area_unit')
      .eq('category', product.category)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(4)
    relatedProducts = data || []
  }

  const faqs: { question: string; answer: string }[] = Array.isArray(product.faq) ? product.faq : []
  const productUrl = `${SITE_URL}/products/${product.slug}`

  const breadcrumbs = [
    { name: 'Home', url: SITE_URL },
    { name: 'Products', url: `${SITE_URL}/products` },
    { name: product.category || 'Printing', url: `${SITE_URL}/categories/${product.product_type || 'all'}` },
    { name: product.name, url: productUrl },
  ]

  return (
    <>
      {/* Schema.org structured data — in <head> for Google */}
      <ProductSchema product={product} url={productUrl} />
      {faqs.length > 0 && <FAQSchema faqs={faqs} />}
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Client component handles the interactive calculator,
          cart, wishlist, image gallery, and all user interactions.
          The server component above provides SEO-critical HTML. */}
      <ProductPageClient
        product={product}
        relatedProducts={relatedProducts}
        faqs={faqs}
        breadcrumbs={breadcrumbs.map(b => ({ name: b.name, href: b.url }))}
      />
    </>
  )
}