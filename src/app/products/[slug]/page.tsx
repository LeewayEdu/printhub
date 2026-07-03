import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { generateProductMetadata, ProductSchema, BreadcrumbSchema } from '@/components/seo'
import ProductPageClient from './ProductPageClient'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://printhub.cchumedia.com'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
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
  const db = serverClient()

  const { data: product } = await db
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  const { data: related } = await db
    .from('products')
    .select('id, name, slug, images, image_url, display_price, price')
    .eq('is_active', true)
    .eq('category', product.category)
    .neq('id', product.id)
    .limit(4)

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
      />
    </>
  )
}
