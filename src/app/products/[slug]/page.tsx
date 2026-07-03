// src/app/products/[slug]/page.tsx
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

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://printhub.cchumedia.com'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateStaticParams() {
  try {
    const { data } = await supabaseServer
      .from('products')
      .select('slug')
      .eq('is_active', true)
      .not('slug', 'is', null)
    return (data || []).map((p: any) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [{ data: product }, { data: relatedRaw }] = await Promise.all([
    supabaseServer
      .from('products')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single(),
    supabaseServer
      .from('spec_options')
      .select('*')
      .order('spec_group')
      .order('sort_order'),
  ])

  if (!product) notFound()

  let relatedProducts: any[] = []
  if (product.related_product_ids?.length) {
    const { data } = await supabaseServer
      .from('products')
      .select('id, name, slug, display_price, price, images, image_url, badge, pricing_model, area_rate, area_unit')
      .in('id', product.related_product_ids)
      .eq('is_active', true)
    relatedProducts = data || []
  } else {
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
      <ProductSchema product={product} url={productUrl} />
      {faqs.length > 0 && <FAQSchema faqs={faqs} />}
      <BreadcrumbSchema items={breadcrumbs} />
      <ProductPageClient
        product={product}
        relatedProducts={relatedProducts}
        faqs={faqs}
        breadcrumbs={breadcrumbs.map(b => ({ name: b.name, href: b.url }))}
      />
    </>
  )
}