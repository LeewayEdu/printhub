'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart, Star, Check } from 'lucide-react'

const KITS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 75000,
    badge: null,
    isPopular: false,
    tagline: 'You just registered your business. Now look like one.',
    items: [
      '250 Business Cards (both sides)',
      '1 Complimentary Slip pad (50 leaves)',
      '1 Letterhead design + 20 printed copies',
      '1 Rubber Stamp',
      'Social Media profile setup (2 platforms)',
      'Logo design (if needed)',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 150000,
    badge: 'Most Popular',
    isPopular: true,
    tagline: 'Look established from day one.',
    items: [
      'Everything in Basic',
      '500 Business Cards',
      '1 A5 Notepad (100 leaves, branded)',
      '2 Polo Shirts (branded)',
      '1 Pull-up Banner (standard size)',
      '1 Branded File Folder (50 pcs)',
      'Google Business Profile setup',
      'WhatsApp Business setup',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 280000,
    badge: null,
    isPopular: false,
    tagline: 'Arrive in every room looking like a million naira.',
    items: [
      'Everything in Standard',
      '1,000 Business Cards',
      '1 Branded Tote Bag (50 pcs)',
      '1 Branded Pen (100 pcs)',
      '1 Car Sticker (vinyl)',
      '1 Office Door Sign',
      '1 Roll-up Banner',
      'Turnaround: 10-14 working days',
    ],
  },
]

export default function StarterKitsPage() {
  const [pinnedProducts, setPinnedProducts] = useState<any[]>([])
  const [categoryProducts, setCategoryProducts] = useState<any[]>([])
  const { addToCart } = useCartStore()

  useEffect(() => {
    const load = async () => {
      const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('slug', 'starter-kits')
        .single()

      if (collection) {
        const { data: pinned } = await supabase
          .from('collection_products')
          .select('sort_order, products(*)')
          .eq('collection_id', collection.id)
          .order('sort_order')
        if (pinned) setPinnedProducts(pinned.map((p: any) => p.products))
      }

      const { data: catProducts } = await supabase
        .from('products')
        .select('*')
        .in('category', ['Business Cards', 'Papers & Stationery', 'Branded Souvenirs', 'Shirts & Uniforms'])
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .limit(12)

      if (catProducts) setCategoryProducts(catProducts)
    }
    load()
  }, [])

  const allProducts = [
    ...pinnedProducts,
    ...categoryProducts.filter(
      (p) => !pinnedProducts.find((pp: any) => pp?.id === p.id)
    ),
  ]

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
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 38, color: 'var(--text-primary)', marginBottom: 8 }}>
                    N{kit.price.toLocaleString()}
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
                    href={`https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20order%20the%20${encodeURIComponent(kit.name)}%20Starter%20Kit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', background: kit.isPopular ? 'var(--red)' : '#1A1A1A', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
                  >
                    Order this Kit
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {allProducts.length > 0 && (
          <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ marginBottom: 36 }}>
                <div className="badge badge-red" style={{ marginBottom: 12 }}>Individual items</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 34px)', marginBottom: 10, color: 'var(--text-primary)' }}>
                  Order individual items too
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Not ready for a full kit? Order exactly what you need.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
                {allProducts.filter(Boolean).map((product: any) => (
                  <div key={product.id} className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ height: 160, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '🖨️'
                      }
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{product.category}</div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{product.name}</div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)', marginBottom: 12 }}>
                        N{Number(product.price).toLocaleString()}
                      </div>
                      <button
                        onClick={() => addToCart(product.id, product.name, product.price, '1 pc')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        <ShoppingCart size={13} /> Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
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
