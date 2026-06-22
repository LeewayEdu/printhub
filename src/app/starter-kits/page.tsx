'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Star, Check } from 'lucide-react'

const KITS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 40000,
    badge: null,
    isPopular: false,
    tagline: 'You just registered your business. Now look like one.',
    items: [
      '250 Business Cards (double-sided)',
      '20 Letterheads (A4, printed) + design',
      '1 Rubber Stamp',
      'Logo design (if needed)',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 130000,
    badge: 'Most Popular',
    isPopular: true,
    tagline: 'Look established from day one.',
    items: [
      'Everything in Basic',
      '500 Business Cards (instead of 250)',
      '1 A5 Notepad (100 leaves, branded)',
      '2 Polo Shirts (branded, front logo)',
      '1 Pull-up Banner (2×5ft, with stand)',
      'Google Business Profile setup',
      'WhatsApp Business setup',
    ],
  },
  {
    // ✅ RESOLVED 17 June 2026: pen base cost confirmed at ₦600/pen
    // (was previously unpriced — flat ₦300 modifier-only assumption).
    // With the real base cost included, 100 fully-branded pens would
    // have pushed this kit's real cost to ₦307,076 — ABOVE the
    // ₦280,000 selling price (negative margin). Reduced quantity to
    // 30 pens to restore the ~40% target margin while keeping the
    // price unchanged, per user's explicit choice over raising price
    // or swapping the item.
    id: 'premium',
    name: 'Premium',
    price: 280000,
    badge: null,
    isPopular: false,
    tagline: 'Arrive in every room looking like a million naira.',
    items: [
      'Everything in Standard',
      '1,000 Business Cards (instead of 500)',
      '50 Branded Tote Bags',
      '30 Branded Pens',
      '1 Car Sticker (vinyl, 12×12in)',
      '1 Office Door Sign',
      'Turnaround: 10-14 working days',
    ],
  },
]

// Marketing categories with confirmed inventory (per Supabase check):
// Business Cards (2), Office & Business Stationery (21), Shirts & Uniforms (2)
const RELEVANT_MARKETING_CATEGORIES = [
  'Business Cards',
  'Office & Business Stationery',
  'Promotional Items & Gifts',
  'Shirts & Uniforms',
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

export default function StarterKitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Marketing-category-based lookup, replacing the old dead `category`
      // column query (Business Cards, Papers & Stationery, etc no longer
      // match any product after the pricing/marketing category split).
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

        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.18) 0%, transparent 55%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, textAlign: 'center' as const }}>
            <div className="badge badge-red" style={{ marginBottom: 16 }}>New business? Start here</div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
              Launch your business looking like a{' '}
              <span style={{ color: 'var(--red)' }}>million naira.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
              One package. Everything included. Zero stress.
            </p>
          </div>
        </section>

        <section style={{ background: 'var(--bg-secondary)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }} className="kits-grid">
              {KITS.map((kit) => (
                <div
                  key={kit.id}
                  id={kit.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: kit.isPopular ? '2px solid var(--red)' : '2px solid var(--border-color)',
                    borderRadius: 16,
                    padding: 32,
                    position: 'relative' as const,
                    transform: kit.isPopular ? 'scale(1.03)' : 'none',
                    boxShadow: kit.isPopular ? '0 12px 40px rgba(192,57,43,0.15)' : 'none',
                  }}
                >
                  {kit.badge && (
                    <div style={{ position: 'absolute' as const, top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, padding: '5px 18px', borderRadius: 20, whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={10} fill="white" /> {kit.badge}
                    </div>
                  )}
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>
                    {kit.name}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--red)', marginBottom: 8 }}>
                    Request a Quotation
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6, fontStyle: 'italic' }}>
                    {kit.tagline}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 28 }}>
                    {kit.items.map((item) => (
                      <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Check size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={`https://wa.me/2348052929523?text=Hello%2C%20I%20would%20like%20a%20quote%20for%20the%20${encodeURIComponent(kit.name)}%20Starter%20Kit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', background: kit.isPopular ? 'var(--red)' : '#1A1A1A', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
                  >
                    Request a Quote →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Individual products — links to /shop with the full calculator,
            rather than duplicating spec selection on this landing page */}
        {!loading && products.length > 0 && (
          <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ marginBottom: 36 }}>
                <div className="badge badge-red" style={{ marginBottom: 12 }}>Individual items</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 34px)', marginBottom: 10, color: 'var(--text-primary)' }}>
                  Order individual items too
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Not ready for a full kit? Order exactly what you need — choose specs and quantity on the product page.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
                {products.map((product) => {
                  const img = product.images?.[0] || product.image_url
                  return (
                    <Link key={product.id} href="/shop" className="card-hover"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                      <div style={{ height: 160, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                        {img ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖨️'}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>{product.name}</div>
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

        <section style={{ background: 'var(--red)', padding: '64px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'white', marginBottom: 14 }}>
              Not sure which kit is right?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 28, lineHeight: 1.7 }}>
              Chat with us on WhatsApp and we will help you choose the best package for your business and budget.
            </p>
            <a
              href="https://wa.me/2348052929523?text=Hello%2C%20I%20need%20help%20choosing%20a%20Starter%20Kit"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}
            >
              Chat with us
            </a>
          </div>
        </section>

      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .kits-grid { grid-template-columns: 1fr !important; }
          .kits-grid div { transform: none !important; }
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}