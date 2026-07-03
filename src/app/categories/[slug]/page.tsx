// src/app/categories/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/seo'

const SITE_URL = 'https://printhub.cchumedia.com'
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateStaticParams() {
  const { data } = await supabaseServer.from('categories').select('slug').eq('is_active', true)
  return (data || []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: cat } = await supabaseServer.from('categories').select('label, seo_title, meta_description, slug').eq('slug', params.slug).single()
  if (!cat) return { title: 'Not Found' }
  const title = cat.seo_title || `${cat.label} | PrintHub Abuja`
  const description = cat.meta_description || `Browse our full range of ${cat.label} products. Professional printing in Abuja, Nigeria — fast turnaround, competitive prices.`
  return { title, description, alternates: { canonical: `${SITE_URL}/categories/${cat.slug}` } }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { data: category } = await supabaseServer
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()
  if (!category) notFound()

  const { data: products } = await supabaseServer
    .from('products')
    .select('id, name, slug, display_price, price, images, image_url, short_description, badge, pricing_model, area_rate, area_unit, rating, review_count')
    .eq('product_type', params.slug)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const breadcrumbs = [
    { name: 'Home', href: SITE_URL },
    { name: 'All Products', href: `${SITE_URL}/products` },
    { name: category.label },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs.map(b => ({ name: b.name, url: b.href || `${SITE_URL}/categories/${category.slug}` }))} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)' }}>
        <Breadcrumbs items={breadcrumbs} />

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', color: 'var(--text-primary)', marginBottom: 12 }}>
            {category.label}
          </h1>
          {category.full_description && (
            <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, maxWidth: 640 }}>{category.full_description}</p>
          )}
        </div>

        {products && products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="cat-products-grid">
            {products.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                  <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#f7f7f5' }}>
                    {(p.images?.[0] || p.image_url)
                      ? <img src={p.images?.[0] || p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🖨️</div>
                    }
                  </div>
                  <div style={{ padding: 16 }}>
                    {p.badge && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'rgba(192,57,43,0.08)', padding: '2px 8px', borderRadius: 10, display: 'inline-block', marginBottom: 6, fontFamily: 'Montserrat' }}>{p.badge}</div>
                    )}
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                    {p.short_description && (
                      <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5, marginBottom: 8 }}>{p.short_description}</p>
                    )}
                    {(p.display_price || p.price) > 0 && (
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>
                        From ₦{Number(p.display_price || p.price).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center' as const, padding: '60px 0', color: 'var(--gray)' }}>No products found in this category.</div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) { .cat-products-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .cat-products-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}