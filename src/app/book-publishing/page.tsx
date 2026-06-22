'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { Check, ShoppingCart } from 'lucide-react'

// ============================================================
// PUBLISHING SERVICES — these are fixed, ONE-TIME service fees,
// separate from book PRINTING (which is qty/page-based and lives
// in the `book_printing` pricing category / calculator).
//
// Figures sourced from real 2026 Nigerian self-publishing market
// data (Black Tower Publishers cost guide) and the user's own
// confirmed ISBN agency cost — NOT invented. Editing is priced
// per word since a flat fee would either overcharge short
// manuscripts or undercharge long ones; everything else is a
// flat fee since those don't scale meaningfully with length.
// ============================================================

const EDITING_RATE_PER_WORD = 2 // ₦2/word — light proofread/copy-edit, low end of ₦2-5/word market range

const SERVICES = [
  {
    name: 'Manuscript Editing & Proofreading',
    price: `₦${EDITING_RATE_PER_WORD}/word`,
    desc: 'Copy-editing and proofreading for grammar, clarity and consistency.',
    note: 'A typical 40,000-word manuscript costs around ₦80,000. Get an exact quote by sharing your word count.',
  },
  {
    name: 'Cover Design',
    price: 'From ₦15,000',
    desc: 'Basic single-concept cover from ₦15,000; custom multi-concept design ₦35,000–₦70,000.',
  },
  {
    name: 'Interior Formatting & Typesetting',
    price: '₦20,000 – ₦50,000',
    desc: 'Professional page layout for print and eBook — pricing depends on complexity (text-only vs. image-heavy).',
  },
  {
    name: 'ISBN Registration',
    price: '₦5,500',
    desc: 'Official ISBN via the Nigerian ISBN agency, including the required 3 copies submission.',
  },
  {
    name: 'eBook Conversion (PDF + ePub)',
    price: '₦15,000',
    desc: 'Convert your finished interior into Kindle/ePub-ready and PDF formats.',
  },
]

const PROCESS = [
  { step: '01', title: 'Submit your manuscript', desc: 'Send us your completed manuscript in Word or PDF format. We review it and get back to you within 24 hours with a personalised quote.' },
  { step: '02', title: 'Edit, design & format', desc: 'Pick the services you need — editing, cover design, typesetting — each priced individually so you only pay for what your book actually needs.' },
  { step: '03', title: 'Choose your print run', desc: 'Use our live calculator to price your print run by paper type, cover, binding and quantity — with bulk discounts built in.' },
  { step: '04', title: 'Print & deliver', desc: 'We print at our Abuja studio and deliver your copies. ISBN registration and eBook conversion handled alongside, if selected.' },
]

interface BookProduct {
  id: string
  name: string
  display_price: number | null
  price: number | null
  is_fixed_price: boolean | null
  images: string[] | null
  image_url: string | null
}

export default function BookPublishingPage() {
  const [printProducts, setPrintProducts] = useState<BookProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Pull any products tagged under the 'Book Publishing' marketing
      // category — these are real printable book products using the
      // book_printing pricing category's calculator, not the old fake
      // bundle packages.
      const { data: cat } = await supabase
        .from('marketing_categories').select('id').eq('label', 'Book Publishing').single()
      if (!cat) { setLoading(false); return }
      const { data: tags } = await supabase
        .from('product_marketing_categories').select('product_id').eq('marketing_category_id', cat.id)
      const ids = (tags || []).map(t => t.product_id)
      if (ids.length === 0) { setLoading(false); return }
      const { data: prods } = await supabase
        .from('products').select('id, name, display_price, price, is_fixed_price, images, image_url')
        .in('id', ids).eq('is_active', true)
      if (prods) setPrintProducts(prods as BookProduct[])
      setLoading(false)
    }
    load()
  }, [])

  const priceLabel = (p: BookProduct) => {
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
                Editing, cover design, typesetting, ISBN registration and printing — pick exactly what your book needs, priced individually so you never overpay for services you don't need.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                <a href="#services" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
                  View Services & Pricing
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
                { value: 'A la carte', label: 'Pay only for what you need' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--red)', lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
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

        {/* SERVICES — replaces the old fake fixed-price bundle packages.
            Each service priced individually and honestly, sourced from
            real 2026 Nigerian market data, not invented bundle prices. */}
        <section id="services" style={{ background: 'var(--bg-secondary)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Publishing services</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                Pick the services your book needs
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
                No fixed bundles — every author's book is different. Choose services individually, or message us for a full personalised quote covering everything from editing to printed copies.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, maxWidth: 760, margin: '0 auto' }}>
              {SERVICES.map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' as const }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
                    {s.note && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, fontStyle: 'italic' as const }}>{s.note}</div>}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', whiteSpace: 'nowrap' as const }}>Request a Quote</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' as const, marginTop: 32 }}>
              <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20a%20full%20publishing%20quote%20for%20my%20book"
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                💬 Get a Full Publishing Quote
              </a>
            </div>
          </div>
        </section>

        {/* PRINTING — points to the live calculator via the book_printing
            pricing category, instead of a bundled fixed-price "X copies
            included" line that we can no longer stand behind. */}
        <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 36 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Book printing</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                Print your finished book
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
                Choose paper type, cover finish, binding and quantity — pricing updates live, with built-in bulk discounts at 100, 250, 500 and 1,000+ copies.
              </p>
            </div>

            {!loading && printProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="products-grid">
                {printProducts.map(product => {
                  const img = product.images?.[0] || product.image_url
                  return (
                    <Link key={product.id} href="/shop" className="card-hover"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                      <div style={{ height: 140, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                        {img ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📚'}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>{product.name}</div>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12 }}>
                          <ShoppingCart size={13} /> Price My Book
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center' as const, padding: '40px 20px' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Add a "Book Printing" product in the shop to enable live pricing here, or message us directly for a quote.
                </p>
                <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20print%20my%20book"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--black)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 9, textDecoration: 'none' }}>
                  💬 Get a Printing Quote
                </a>
              </div>
            )}
          </div>
        </section>

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