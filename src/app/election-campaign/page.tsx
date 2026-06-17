'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, CheckCircle } from 'lucide-react'

const CAMPAIGN_PACKAGES = [
  {
    name: 'Ward Package',
    price: 930000,
    desc: 'Perfect for ward-level campaigns and grassroots mobilisation.',
    items: ['500 A3 Campaign Posters', '2 Pull-up Banners', '50 Campaign T-Shirts', '50 Campaign Caps', '100 Branded Pens'],
    hasEstimate: true,
  },
  {
    name: 'LGA Package',
    price: 3040000,
    desc: 'Comprehensive coverage for local government area campaigns.',
    items: ['2,000 A3 Campaign Posters', '5 Pull-up Banners', '100 Campaign T-Shirts', '100 Campaign Vests', '200 Campaign Caps', '1 Large Outdoor Banner (10×4ft)', 'Vehicle branding (1 car)'],
    badge: 'Most Requested',
    hasEstimate: true,
  },
  {
    name: 'State Package',
    price: 18900000,
    desc: 'Full-scale state-wide campaign materials package.',
    items: ['10,000 A3 Campaign Posters', '20 Pull-up Banners', '500 Campaign T-Shirts', '500 Campaign Vests', '500 Campaign Caps', '5 Large Outdoor Banners', 'Vehicle branding (3 vehicles)', 'Wall calendars (1,000 pcs)'],
    hasEstimate: true,
  },
]

// Marketing categories relevant to a campaign — pulls from whichever of these
// actually have tagged products. As of the last check, 'Election & Campaign
// Materials' has 0 tagged products yet, so this also pulls from related
// categories (apparel, promo items) that DO have inventory likely usable
// for campaigns (caps, t-shirts, pens, etc.) so the section isn't empty.
const RELEVANT_MARKETING_CATEGORIES = [
  'Election & Campaign Materials',
  'Banners & Large Format',
  'Shirts & Uniforms',
  'Promotional Items & Gifts',
]

interface Product {
  id: string
  name: string
  display_price: number | null
  price: number | null
  is_fixed_price: boolean | null
  images: string[] | null
  image_url: string | null
}

export default function ElectionCampaignPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Look up marketing category IDs by label, then pull tagged products
      // via the junction table — replaces the old dead `category` column
      // query, which no longer matches anything after the pricing/marketing
      // category split.
      const { data: cats } = await supabase
        .from('marketing_categories')
        .select('id, label')
        .in('label', RELEVANT_MARKETING_CATEGORIES)

      if (!cats || cats.length === 0) { setLoading(false); return }

      const { data: tags } = await supabase
        .from('product_marketing_categories')
        .select('product_id')
        .in('marketing_category_id', cats.map(c => c.id))

      const productIds = Array.from(new Set((tags || []).map(t => t.product_id)))
      if (productIds.length === 0) { setLoading(false); return }

      const { data: prods } = await supabase
        .from('products')
        .select('id, name, display_price, price, is_fixed_price, images, image_url')
        .in('id', productIds)
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .limit(12)

      if (prods) setProducts(prods as Product[])
      setLoading(false)
    }
    load()
  }, [])

  const priceLabel = (p: Product) => {
    const base = Number(p.display_price || p.price || 0)
    if (!base) return 'Get a quote'
    return p.is_fixed_price ? `₦${base.toLocaleString()}` : `From ₦${base.toLocaleString()}`
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.2) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(192,57,43,0.08) 0%, transparent 40%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div className="badge badge-red" style={{ marginBottom: 16 }}>Election campaign materials</div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
              Win your election with<br /><span style={{ color: 'var(--red)' }}>powerful campaign materials.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 540, lineHeight: 1.75, marginBottom: 32 }}>
              Posters, banners, shirts, vests, caps, calendars — everything your campaign needs, produced fast and delivered across Nigeria.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <a href="#packages" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>View Packages →</a>
              <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20need%20campaign%20materials" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                💬 Get a custom quote
              </a>
            </div>
          </div>
        </section>

        {/* Why us */}
        <section style={{ background: 'var(--bg-secondary)', padding: '60px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="why-grid">
            {[
              { icon: '⚡', title: 'Fast turnaround', desc: 'Most orders ready in 3–5 working days' },
              { icon: '🇳🇬', title: 'Nationwide delivery', desc: 'We ship to all 36 states' },
              { icon: '💰', title: 'Bulk discounts', desc: 'Better prices on larger quantities' },
              { icon: '✅', title: 'Trusted by parties', desc: 'APC, LP, ADC and more have used us' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, textAlign: 'center' as const }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Packages — static pricing, unaffected by the calculator migration */}
        <section id="packages" style={{ background: 'var(--bg)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Campaign packages</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>Ready-made campaign packages</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>Choose a package or mix and match individual items below. Prices reflect current material costs and are confirmed exactly when you place your order.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="packages-grid">
              {CAMPAIGN_PACKAGES.map((pkg, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: `2px solid ${pkg.badge ? 'var(--red)' : 'var(--border-color)'}`, borderRadius: 16, padding: 28, position: 'relative' as const, boxShadow: pkg.badge ? '0 12px 40px rgba(192,57,43,0.12)' : 'none' }}>
                  {pkg.badge && (
                    <div style={{ position: 'absolute' as const, top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, padding: '5px 18px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                      ⭐ {pkg.badge}
                    </div>
                  )}
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 }}>{pkg.name}</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 32, color: 'var(--red)', marginBottom: 4 }}>₦{pkg.price.toLocaleString()}</div>
                  {pkg.hasEstimate && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                      Estimated price — based on current material costs, confirmed exactly when you request a quote.
                    </div>
                  )}
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6, marginTop: pkg.hasEstimate ? 0 : 8 }}>{pkg.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
                    {pkg.items.map(item => (
                      <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <CheckCircle size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <a href={`https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20order%20the%20${encodeURIComponent(pkg.name)}%20campaign%20package`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: pkg.badge ? 'var(--red)' : 'var(--black)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    Order this Package →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Individual Products — now sourced from marketing categories.
            Each card links to the main shop, pre-filtered to that product's
            category, where the full spec calculator lives — no calculator
            duplication on this page. */}
        {!loading && products.length > 0 && (
          <section style={{ background: 'var(--bg-secondary)', padding: '72px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ marginBottom: 32 }}>
                <div className="badge badge-red" style={{ marginBottom: 12 }}>Individual items</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 32px)', color: 'var(--text-primary)', marginBottom: 8 }}>Order individual campaign items</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Pick exactly what your campaign needs — choose specs and quantity on the product page.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
                {products.map((product) => {
                  const img = product.images?.[0] || product.image_url
                  return (
                    <Link key={product.id} href="/shop" className="card-hover"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                      <div style={{ height: 160, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                        {img ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🗳️'}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{product.name}</div>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)', marginBottom: 12 }}>{priceLabel(product)}</div>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12 }}>
                          <ShoppingCart size={13} /> View & Order
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section style={{ background: 'var(--black)', padding: '64px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'white', marginBottom: 14 }}>
              Need a custom campaign package?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 28, lineHeight: 1.7 }}>
              Tell us your budget, state, and election type — we will build the perfect package for your campaign.
            </p>
            <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20need%20a%20custom%20campaign%20materials%20quote"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
              💬 Get a custom quote →
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .why-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .packages-grid { grid-template-columns: 1fr !important; }
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) { .products-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}