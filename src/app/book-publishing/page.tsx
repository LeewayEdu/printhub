'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart, Check } from 'lucide-react'

const PACKAGES = [
  {
    name: 'Basic Publishing',
    price: 80000,
    badge: null,
    desc: 'Perfect for first-time authors on a budget.',
    items: [
      'Manuscript editing consultation',
      'Book interior layout & typesetting',
      'Cover design (1 concept)',
      'Print-ready PDF delivery',
      '50 printed copies (perfect bound)',
      'Turnaround: 10-14 working days',
    ],
  },
  {
    name: 'Standard Publishing',
    price: 150000,
    badge: 'Most Popular',
    desc: 'The complete self-publishing package.',
    items: [
      'Everything in Basic',
      'ISBN registration',
      'Professional cover design (3 concepts)',
      '100 printed copies',
      'eBook conversion (PDF + ePub)',
      'Author copies delivery (Abuja)',
      'Turnaround: 14-21 working days',
    ],
  },
  {
    name: 'Premium Publishing',
    price: 280000,
    badge: null,
    desc: 'Full-service publishing for serious authors.',
    items: [
      'Everything in Standard',
      'Professional proofreading',
      '200 printed copies',
      'National distribution consultation',
      'Author website setup',
      'Social media launch kit',
      'Turnaround: 21-30 working days',
    ],
  },
]

const PROCESS = [
  { step: '01', title: 'Submit your manuscript', desc: 'Send us your completed manuscript in Word or PDF format. We review it and get back to you within 24 hours.' },
  { step: '02', title: 'Design & layout', desc: 'Our team designs your cover and lays out the interior pages professionally. You approve before we print.' },
  { step: '03', title: 'Print & bind', desc: 'We print your book at our Abuja studio with quality paper and professional binding.' },
  { step: '04', title: 'Deliver to you', desc: 'Your finished copies are delivered to you. We also handle ISBN registration and eBook conversion.' },
]

export default function BookPublishingPage() {
  const [pinnedProducts, setPinnedProducts] = useState<any[]>([])
  const [categoryProducts, setCategoryProducts] = useState<any[]>([])
  const { addToCart } = useCartStore()

  useEffect(() => {
    const load = async () => {
      const { data: catProducts } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Book Publishing')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .limit(8)
      if (catProducts) setCategoryProducts(catProducts)
    }
    load()
  }, [])

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.18) 0%, transparent 55%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="hero-grid">
            <div>
              <div className="badge badge-red" style={{ marginBottom: 16 }}>Book publishing</div>
              <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 56px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
                Your story deserves<br />
                <span style={{ color: 'var(--red)' }}>to be in print.</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 440, lineHeight: 1.75, marginBottom: 32 }}>
                From manuscript to finished book. We handle editing, design, printing, ISBN registration, and eBook conversion — all from our Abuja studio.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                <a href="#packages" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
                  View Packages
                </a>
                <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20publish%20a%20book"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                  Talk to us
                </a>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { value: '50+', label: 'Books published' },
                { value: 'ISBN', label: 'Registration included' },
                { value: 'eBook', label: 'Conversion available' },
                { value: '10-30', label: 'Days turnaround' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--red)', lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>How it works</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                From manuscript to bookshelf
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="process-grid">
              {PROCESS.map((p, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 24, position: 'relative' as const }}>
                  <div style={{ position: 'absolute' as const, top: 16, right: 16, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 48, color: 'var(--red)', opacity: 0.06, lineHeight: 1 }}>
                    {p.step}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, color: 'var(--red)', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                    Step {p.step}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--text-primary)' }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages */}
        <section id="packages" style={{ background: 'var(--bg-secondary)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Publishing packages</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                Choose your publishing package
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
                Every package includes professional design and printing. Choose based on your goals and budget.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }} className="packages-grid">
              {PACKAGES.map((pkg, i) => {
                const isPopular = pkg.badge === 'Most Popular'
                return (
                  <div key={i} style={{ background: 'var(--bg-card)', border: isPopular ? '2px solid var(--red)' : '2px solid var(--border-color)', borderRadius: 16, padding: 32, position: 'relative' as const, transform: isPopular ? 'scale(1.03)' : 'none', boxShadow: isPopular ? '0 12px 40px rgba(192,57,43,0.15)' : 'none' }}>
                    {pkg.badge && (
                      <div style={{ position: 'absolute' as const, top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, padding: '5px 18px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                        {pkg.badge}
                      </div>
                    )}
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>{pkg.name}</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 34, color: 'var(--red)', marginBottom: 8 }}>
                      N{pkg.price.toLocaleString()}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>{pkg.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
                      {pkg.items.map(item => (
                        <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <Check size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <a href={`https://wa.me/2348052929523?text=Hello%2C%20I%20want%20the%20${encodeURIComponent(pkg.name)}%20package`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px', background: isPopular ? 'var(--red)' : '#1A1A1A', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                      Get Started
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Individual products */}
        {categoryProducts.length > 0 && (
          <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ marginBottom: 32 }}>
                <div className="badge badge-red" style={{ marginBottom: 12 }}>Individual services</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 32px)', color: 'var(--text-primary)', marginBottom: 8 }}>
                  Order individual publishing services
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Already have some things done? Order only what you need.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
                {categoryProducts.map((product: any) => (
                  <div key={product.id} className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ height: 140, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '📚'}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--text-primary)' }}>{product.name}</div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)', marginBottom: 12 }}>
                        N{Number(product.price).toLocaleString()}
                      </div>
                      <button onClick={() => addToCart(product.id, product.name, product.price, '1 pc')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <ShoppingCart size={13} /> Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section style={{ background: 'var(--black)', padding: '64px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'white', marginBottom: 14 }}>
              Ready to publish your book?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 28, lineHeight: 1.7 }}>
              Send us your manuscript today. We will review it and give you a personalised quote within 24 hours.
            </p>
            <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20publish%20a%20book%20with%20PrintHub"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 9, textDecoration: 'none' }}>
              Start your publishing journey
            </a>
          </div>
        </section>

      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .process-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .packages-grid { grid-template-columns: 1fr !important; }
          .packages-grid div { transform: none !important; }
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .process-grid { grid-template-columns: 1fr !important; }
          .products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}