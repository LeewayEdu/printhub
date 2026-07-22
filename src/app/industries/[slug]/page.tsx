// src/app/industries/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { generateIndustryMetadata, Breadcrumbs, BreadcrumbSchema } from '@/components/seo'
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'


const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateStaticParams() {
  const { data } = await supabaseServer.from('industries').select('slug').eq('is_active', true)
  return (data || []).map(i => ({ slug: i.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await supabaseServer.from('industries').select('name, seo_title, meta_description, slug, hero_image').eq('slug', params.slug).single()
  if (!data) return { title: 'Not Found' }
  return generateIndustryMetadata(data)
}

export default async function IndustryPage({ params }: { params: { slug: string } }) {
  const { data: industry } = await supabaseServer
    .from('industries')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()
  if (!industry) notFound()

  // Fetch products associated with this industry
  const { data: industryProducts } = await supabaseServer
    .from('industry_products')
    .select('product_id, sort_order')
    .eq('industry_id', industry.id)
    .order('sort_order')

  let products: any[] = []
  if (industryProducts?.length) {
    const ids = industryProducts.map(ip => ip.product_id)
    const { data } = await supabaseServer
      .from('products')
      .select('id, name, slug, display_price, price, images, image_url, short_description, badge, pricing_model, area_rate, area_unit')
      .in('id', ids)
      .eq('is_active', true)
    products = data || []
  }

  const breadcrumbs = [
    { name: 'Home', href: SITE_URL },
    { name: 'Industries', href: `${SITE_URL}/industries` },
    { name: industry.name },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs.map(b => ({ name: b.name, url: b.href || `${SITE_URL}/industries/${industry.slug}` }))} />

      {/* Hero */}
      <div style={{ position: 'relative' as const, minHeight: 380, display: 'flex', alignItems: 'center', background: industry.hero_image ? undefined : '#111', overflow: 'hidden' }}>
        {industry.hero_image && (
          <>
            <img src={industry.hero_image} alt={industry.name} style={{ position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.65)' }} />
          </>
        )}
        <div style={{ position: 'relative' as const, zIndex: 1, padding: 'clamp(40px, 6vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: 800 }}>
          <Breadcrumbs items={breadcrumbs} />
          <div style={{ fontSize: 40, marginBottom: 12 }}>{industry.icon}</div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
            {industry.headline || industry.name}
          </h1>
          {industry.subheadline && (
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: 600 }}>{industry.subheadline}</p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 32px)' }}>

        {/* Full description */}
        {industry.full_description && (
          <div style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.8, maxWidth: 720, marginBottom: 56 }}
            dangerouslySetInnerHTML={{ __html: industry.full_description }} />
        )}

        {/* Products grid */}
        {products.length > 0 && (
          <section>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 28 }}>
              Print products for {industry.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="industry-products-grid">
              {products.map(p => (
                <Link key={p.id} href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                    <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#f7f7f5' }}>
                      {(p.images?.[0] || p.image_url)
                        ? <img src={p.images?.[0] || p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🖨️</div>
                      }
                    </div>
                    <div style={{ padding: '16px' }}>
                      {p.badge && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'rgba(192,57,43,0.08)', padding: '2px 8px', borderRadius: 10, display: 'inline-block', marginBottom: 6, fontFamily: 'Montserrat' }}>{p.badge}</div>
                      )}
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                      {p.short_description && (
                        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5, marginBottom: 10 }}>{p.short_description}</p>
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
          </section>
        )}

        {/* CTA */}
        <div style={{ marginTop: 64, background: '#111', borderRadius: 20, padding: 'clamp(32px, 5vw, 56px)', textAlign: 'center' as const }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(22px, 3vw, 32px)', color: 'white', marginBottom: 14 }}>
            Ready to brand your {industry.name.split('&')[0].trim()} business?
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 28, lineHeight: 1.6 }}>
            Talk to us on WhatsApp and get a free quote within the hour.
          </p>
          <a href={`https://wa.me/2348052929523?text=${encodeURIComponent(`Hello, I need print materials for my ${industry.name} business`)}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'var(--red)', color: 'white', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            💬 Get a Free Quote
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .industry-products-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .industry-products-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}