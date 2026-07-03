// src/app/products/page.tsx
// All-products listing page — clean SEO-friendly grid with filtering
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const SITE_URL = 'https://printhub.cchumedia.com'
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const metadata: Metadata = {
  title: 'All Products | PrintHub — Professional Printing in Abuja, Nigeria',
  description: 'Browse our full catalogue of printing products and services. Business cards, banners, branded apparel, signage, packaging and more. Fast turnaround, competitive prices.',
  alternates: { canonical: `${SITE_URL}/products` },
}

export default async function ProductsPage() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabaseServer
      .from('products')
      .select('id, name, slug, display_price, price, images, image_url, short_description, badge, category, pricing_model, area_rate, area_unit, product_type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseServer
      .from('categories')
      .select('label, slug')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  // Group products by category for a cleaner browsing experience
  const byCategory: Record<string, any[]> = {}
  ;(products || []).forEach(p => {
    const cat = p.category || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--text-primary)', marginBottom: 12 }}>
          All Print Products
        </h1>
        <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, maxWidth: 600 }}>
          Professional printing for every need — business branding, events, campaigns, books and more. Based in Abuja with nationwide delivery.
        </p>
      </div>

      {Object.entries(byCategory).map(([catName, catProducts]) => (
        <section key={catName} style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>{catName}</h2>
            {catProducts[0]?.product_type && (
              <Link href={`/categories/${catProducts[0].product_type}`}
                style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>
                View all →
              </Link>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
            {catProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', height: '100%', transition: 'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}>
                  <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#f7f7f5' }}>
                    {(p.images?.[0] || p.image_url)
                      ? <img src={p.images?.[0] || p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🖨️</div>
                    }
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                    {(p.display_price || p.price) > 0 && (
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--red)' }}>
                        From ₦{Number(p.display_price || p.price).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <style>{`
        @media (max-width: 900px) { .products-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .products-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}