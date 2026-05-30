'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Star } from 'lucide-react'
import { BRAND, HOME_SERVICES, STARTER_KITS, AFFILIATE_TIERS, CLIENTS } from '@/lib/constants'
import { ProductCard, ShopSidebar, ProductCardData } from '@/components/shop/ShopComponents'

// ─── TYPES ───────────────────────────────────────────────────
interface HeroBanner { id: string; image_url: string; title: string | null; subtitle: string | null; link_url: string | null; overlay_opacity?: number; cta_text?: string | null; cta_url?: string | null }
interface Testimonial { id: string; name: string; company: string | null; text: string; rating: number }
type Product = ProductCardData

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, number>>({})
  const [activeCat, setActiveCat] = useState('All Products')
  const [wishlistIds, setWishlistIds] = useState<string[]>([])


  useEffect(() => {
    // Hero banners
    supabase.from('hero_banners').select('*').eq('is_active', true).eq('page_type', 'home').order('sort_order')
      .then(({ data }) => { if (data?.length) setHeroBanners(data) })

    // Flash sale (active + not expired)

    // Products
    supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setAllProducts(data as Product[])
        setFeaturedProducts((data as Product[]).filter(p => p.featured).slice(0, 8))
        // Build category counts
        const map: Record<string, number> = { 'All Products': data.length }
        data.forEach(p => { map[p.category] = (map[p.category] || 0) + 1 })
        setCategoryMap(map)
      })

    // Testimonials
    supabase.from('testimonials').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setTestimonials(data as Testimonial[]) })

    // Wishlist IDs for current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('wishlists').select('product_id').eq('user_id', session.user.id)
          .then(({ data }) => { if (data) setWishlistIds(data.map(w => w.product_id)) })
      }
    })
  }, [])

  // Hero auto-cycle
  useEffect(() => {
    if (heroBanners.length <= 1) return
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroBanners.length), 5000)
    return () => clearInterval(t)
  }, [heroBanners])

  const bestsellers = allProducts.slice(0, 8)
  const categoryProducts = activeCat === 'All Products'
    ? allProducts.slice(0, 12)
    : allProducts.filter(p => p.category === activeCat).slice(0, 12)

  const SHOP_CATS = ['All Products', ...Array.from(new Set(allProducts.map(p => p.category))).slice(0, 13)]

  // We pass openModal handler — on homepage we just redirect to /shop
  const openProduct = (p: Product) => { router.push(`/shop?product=${p.id}`) }

  const handleSidebarCategory = (cat: string) => {
    if (cat === 'All Products') router.push('/shop')
    else router.push(`/shop?cat=${encodeURIComponent(cat)}`)
  }

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ── */}
        <section style={{ minHeight: '92vh', background: 'var(--black)', display: 'flex', alignItems: 'center', padding: '80px 24px', position: 'relative' as const, overflow: 'hidden' }}>
          {/* Background image layer */}
          {heroBanners.map((banner, i) => (
            <div key={banner.id} style={{ position: 'absolute' as const, inset: 0, transition: 'opacity 1s ease', opacity: i === heroIdx ? 1 : 0, zIndex: 0 }}>
              <img src={banner.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute' as const, inset: 0, background: `rgba(0,0,0,${banner.overlay_opacity ?? 0.62})` }} />
            </div>
          ))}
          {/* Fallback gradient when no banners set */}
          {heroBanners.length === 0 && (
            <>
              <div style={{ position: 'absolute' as const, inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(192,57,43,0.06) 0%, transparent 40%)', zIndex: 0 }} />
              <div style={{ position: 'absolute' as const, inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0 }} />
            </>
          )}

          {/* Hero content */}
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', position: 'relative' as const, zIndex: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 60, alignItems: 'center' }} className="hero-grid">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(192,57,43,0.18)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'Montserrat', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    {heroBanners[heroIdx]?.subtitle || 'Now live — Order printing online'}
                  </span>
                </div>
                <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(30px, 5.5vw, 68px)', color: 'white', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
                  {heroBanners[heroIdx]?.title || (
                    <>Your print orders,<br />handled <span style={{ color: 'var(--red)' }}>online.</span></>
                  )}
                </h1>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', maxWidth: 500, lineHeight: 1.75, fontWeight: 300, marginBottom: 36 }}>
                  Browse, book, and manage all your printing needs from your phone or laptop. Banners, branding, souvenirs, books and more — trusted by {BRAND.stats.jobs} clients since {BRAND.since}.
                </p>
                <div className="hero-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 48 }}>
                  <Link href={heroBanners[heroIdx]?.cta_url || heroBanners[heroIdx]?.link_url || '/shop'} className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
                    {heroBanners[heroIdx]?.cta_text || 'Shop Now'}
                  </Link>
                  <Link href="#how-it-works" className="btn btn-ghost" style={{ fontSize: 15, padding: '14px 28px' }}>How it works</Link>
                </div>
                <div className="hero-stats" style={{ display: 'flex', gap: 0, flexWrap: 'wrap' as const }}>
                  {[
                    { value: BRAND.stats.years, label: 'Years in business' },
                    { value: BRAND.stats.jobs, label: 'Jobs delivered' },
                    { value: BRAND.stats.startingPrice, label: 'Starting price' },
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      {i > 0 && <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 24px' }} />}
                      <div>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 26, color: 'white', lineHeight: 1 }}>{stat.value}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className="hero-right" style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16 }}>Standard Starter Kit</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 36, color: 'white', marginBottom: 4 }}>₦150,000</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>Everything a new business needs to look professional</div>
                  {['500 Business Cards', '2 Branded Polo Shirts', '1 Pull-up Banner', 'Google Business Setup'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: 'var(--red)', fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                    </div>
                  ))}
                  <Link href="/starter-kits" style={{ display: 'block', width: '100%', padding: '12px', background: 'var(--red)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textAlign: 'center' as const, textDecoration: 'none', marginTop: 20 }}>
                    View All Kits
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {['🎌 Banners', '💳 Cards', '👕 Uniforms', '📚 Books', '🗳️ Campaign', '🎨 Design'].map(tag => (
                    <span key={tag} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hero dots */}
          {heroBanners.length > 1 && (
            <div style={{ position: 'absolute' as const, bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 3 }}>
              {heroBanners.map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === heroIdx ? 'white' : 'rgba(255,255,255,0.35)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
              ))}
            </div>
          )}
        </section>

        {/* ── BELOW HERO: SIDEBAR LAYOUT ── */}
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 28, alignItems: 'flex-start' }} className="sidebar-layout">

          {/* LEFT SIDEBAR */}
          <ShopSidebar
            categoryMap={categoryMap}
            activeCategory={activeCat}
            onCategoryChange={handleSidebarCategory}
            mode="navigate"
          />

          {/* RIGHT CONTENT */}
          <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── SCROLLING TRUST TICKER ── */}
        <div style={{ background: 'var(--red)', overflow: 'hidden', padding: '13px 0' }}>
          <div className="trust-track">
            {[...Array(2)].flatMap(() => [
              '🚀 Lightning-fast 24hr rush service',
              '🎨 Free design review on every order',
              '💰 Prices from ₦3,000',
              '🔄 Free reprint guarantee',
              '📦 Nationwide delivery across all 36 states',
              '⭐ Earn 2% loyalty points on every order',
              '✅ 300 DPI quality check on all files',
              '💳 Paystack · Bank Transfer · WhatsApp',
            ]).map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 36px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, borderRight: '1px solid rgba(255,255,255,0.25)' }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ background: 'white', padding: '40px 0' }}>
          <div className="section-inner">
            <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Simple process</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 40px)', marginBottom: 14, color: 'var(--text-primary)' }}>Order in three easy steps</h2>
              <p style={{ fontSize: 15, color: 'var(--gray)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>No more running around. Place your order online and we handle everything.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="steps-grid">
              {[
                { num: '01', icon: '📋', title: 'Register & Browse', desc: 'Create your free account, browse our full catalogue, and choose what you need.' },
                { num: '02', icon: '🏭', title: 'We Print & Produce', desc: 'Our team reviews your design and produces your materials at our Karu, Abuja studio.' },
                { num: '03', icon: '🚚', title: 'Pick up or Deliver', desc: 'Collect from our Abuja outlet or have it shipped anywhere in Nigeria.' },
              ].map((step, i) => (
                <div key={i} className="card-hover" style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, position: 'relative' as const }}>
                  <div style={{ position: 'absolute' as const, top: -10, right: 16, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 80, color: 'var(--red)', opacity: 0.06, lineHeight: 1 }}>{step.num}</div>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{step.icon}</div>
                  <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, marginBottom: 12, color: 'var(--text-primary)' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' as const, marginTop: 32 }}>
              <Link href="/how-it-works" style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600, textDecoration: 'none', fontFamily: 'Montserrat' }}>See full guide with FAQ →</Link>
            </div>
          </div>
        </section>

        {/* ── SHOP BY CATEGORY + LIVE PRODUCTS ── */}
        <section style={{ background: 'var(--light)', padding: '40px 0', borderRadius: 12, marginBottom: 12 }}>
          <div className="section-inner">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap' as const, gap: 16 }}>
              <div>
                <div className="badge badge-red" style={{ marginBottom: 10 }}>Live catalogue</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--text-primary)' }}>Shop by Category</h2>
              </div>
              <Link href="/shop" style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>View all products →</Link>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 28 }}>
              {SHOP_CATS.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${activeCat === cat ? 'var(--red)' : 'var(--border)'}`, background: activeCat === cat ? 'var(--red)' : 'white', color: activeCat === cat ? 'white' : 'var(--gray)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}>
                  {cat}
                  {categoryMap[cat] !== undefined && (
                    <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>({categoryMap[cat]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Products grid */}
            {categoryProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="cat-products-grid">
                {categoryProducts.map(p => <ProductCard key={p.id} product={p} onOpen={openProduct} wishlistIds={wishlistIds} />)}
              </div>
            ) : (
              <div style={{ textAlign: 'center' as const, padding: '48px 0', color: 'var(--gray)' }}>
                Loading products...
              </div>
            )}

            <div style={{ textAlign: 'center' as const, marginTop: 32 }}>
              <Link href="/shop" className="btn btn-outline" style={{ fontSize: 14 }}>Browse full catalogue</Link>
            </div>
          </div>
        </section>

        {/* ── FEATURED PRODUCTS ── */}
        {featuredProducts.length > 0 && (
          <section style={{ background: 'white', padding: '40px 0' }}>
            <div className="section-inner">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap' as const, gap: 12 }}>
                <div>
                  <div className="badge badge-red" style={{ marginBottom: 10 }}>Handpicked</div>
                  <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--text-primary)' }}>Featured Products</h2>
                </div>
                <Link href="/shop" style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="featured-grid">
                {featuredProducts.map(p => <ProductCard key={p.id} product={p} onOpen={openProduct} wishlistIds={wishlistIds} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── BESTSELLERS ── */}
        {bestsellers.length > 0 && (
          <section style={{ background: 'var(--light)', padding: '40px 0', borderRadius: 12, marginBottom: 12 }}>
            <div className="section-inner">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap' as const, gap: 12 }}>
                <div>
                  <div className="badge badge-red" style={{ marginBottom: 10 }}>🔥 Most ordered</div>
                  <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--text-primary)' }}>Bestsellers</h2>
                </div>
                <Link href="/shop" style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="best-grid">
                {bestsellers.map(p => <ProductCard key={p.id} product={p} onOpen={openProduct} wishlistIds={wishlistIds} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── SERVICES ── */}
        <section id="services" style={{ background: 'white', padding: '40px 0' }}>
          <div className="section-inner">
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>What we print</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 40px)', marginBottom: 14, color: 'var(--text-primary)' }}>Everything your brand needs</h2>
              <p style={{ fontSize: 15, color: 'var(--gray)', maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}>From a single flyer to a full corporate branding package.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="services-grid">
              {HOME_SERVICES.map((service, i) => (
                <Link key={i} href="/shop" className="card-hover" style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textDecoration: 'none', display: 'block' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{service.icon}</div>
                  <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--black)' }}>{service.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16 }}>{service.desc}</p>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{service.price}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section style={{ background: 'var(--black)', padding: '40px 0', borderRadius: 12, marginBottom: 12 }}>
          <div className="section-inner">
            <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
              <div className="badge badge-dark" style={{ marginBottom: 14 }}>Why PrintHub</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 40px)', color: 'white', marginBottom: 14 }}>Nigeria's most trusted print partner</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>Since 2011, we've delivered print excellence to 3,000+ clients across Nigeria.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="why-grid">
              {[
                { icon: '⚡', title: 'Lightning Fast', desc: '24hr rush service available. Same-day pickup in Abuja. We work on your timeline, not ours.' },
                { icon: '🎨', title: 'Free Design Review', desc: 'Expert preflight on every file before production. 300 DPI quality check guaranteed. No surprises.' },
                { icon: '💰', title: 'Best Prices in Abuja', desc: 'Starting from ₦3,000. Transparent pricing with no hidden charges. Bulk discounts up to 20% off.' },
                { icon: '🔄', title: 'Free Reprint Guarantee', desc: "If your print doesn't match your approved proof, we reprint for free. Zero risk." },
                { icon: '📦', title: 'Nationwide Delivery', desc: 'Pickup from Karu, Abuja or delivered to any of the 36 states via trusted logistics.' },
                { icon: '⭐', title: 'Loyalty Rewards', desc: 'Earn 2% of every order as loyalty points. Redeem on future orders. The more you print, the more you save.' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '28px 24px', transition: 'border-color 0.2s, background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(192,57,43,0.4)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
                  <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STARTER KITS ── */}
        <section style={{ background: 'white', padding: '40px 0' }}>
          <div className="section-inner">
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>New business? Start here</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 40px)', marginBottom: 14, color: 'var(--text-primary)' }}>Business Starter Kits</h2>
              <p style={{ fontSize: 15, color: 'var(--gray)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>Everything a new business needs from day one, bundled at one flat price.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }} className="kits-grid">
              {STARTER_KITS.map((kit, i) => {
                const isPopular = kit.id === 'standard'
                return (
                  <div key={i} style={{ background: 'white', border: `2px solid ${isPopular ? 'var(--red)' : 'var(--border)'}`, borderRadius: 16, padding: 32, position: 'relative' as const, transform: isPopular ? 'scale(1.03)' : 'none', boxShadow: isPopular ? '0 12px 40px rgba(192,57,43,0.15)' : 'none' }}>
                    {kit.badge && (
                      <div style={{ position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>⭐ {kit.badge}</div>
                    )}
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>{kit.name}</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 36, color: 'var(--black)', marginBottom: 8 }}>₦{kit.price.toLocaleString()}</div>
                    <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 24, lineHeight: 1.6, fontStyle: 'italic' }}>{kit.tagline}</p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 28 }}>
                      {kit.items.map(item => (
                        <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--red)', fontSize: 13, marginTop: 1, flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={`/starter-kits#${kit.id}`} className={`btn ${kit.color === 'red' ? 'btn-primary' : kit.color === 'dark' ? 'btn-dark' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}>
                      {kit.cta}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CLIENTS ── */}
        <section className="section" style={{ background: '#111' }}>
          <div className="section-inner">
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'start' }} className="clients-grid">
              <div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 72, color: 'var(--red)', lineHeight: 1 }}>3,000+</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginTop: 8 }}>Jobs delivered since {BRAND.since}</div>
                <div style={{ width: 40, height: 3, background: 'var(--red)', borderRadius: 2, margin: '20px 0' }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>Trusted by Nigeria's leading organisations, government agencies, businesses and individuals.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }} className="clients-inner-grid">
                {CLIENTS.map(client => (
                  <div key={client} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' as const }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{client}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        {testimonials.length > 0 && (
          <section className="section" style={{ background: 'var(--light)', overflow: 'hidden' }}>
            <div className="section-inner">
              <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
                <div className="badge badge-red" style={{ marginBottom: 14 }}>Client stories</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 40px)', color: 'var(--text-primary)', marginBottom: 14 }}>What our clients say</h2>
                <p style={{ fontSize: 15, color: 'var(--gray)', maxWidth: 420, margin: '0 auto', lineHeight: 1.75 }}>{BRAND.stats.jobs} satisfied customers and counting.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="test-strip">
                {testimonials.slice(0, 6).map(t => (
                  <div key={t.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= t.rating ? '#f59e0b' : 'none'} color={s <= t.rating ? '#f59e0b' : '#d1d5db'} />)}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.7, fontStyle: 'italic', flex: 1 }}>"{t.text}"</p>
                    <div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--black)' }}>{t.name}</div>
                      {t.company && <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{t.company}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── AFFILIATE ── */}
        <section className="section" style={{ background: 'var(--red)' }}>
          <div className="section-inner">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="affiliate-grid">
              <div>
                <div className="badge badge-dark" style={{ marginBottom: 16 }}>Affiliate program</div>
                <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 42px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>Refer clients. Earn for life.</h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: 32, maxWidth: 400 }}>
                  Join the C-Chu Media Affiliate Program and earn commission every time someone you refer places a print order — forever.
                </p>
                <Link href="/affiliate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                  Join free — Get your link
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                {AFFILIATE_TIERS.map((tier, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 32, color: 'white', lineHeight: 1, minWidth: 60 }}>{tier.rate}</div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{tier.orders}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{tier.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
              Ready to <span style={{ color: 'var(--red)' }}>print</span> something great?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.75 }}>Register free and place your first order today. Free design review on every order.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <Link href="/auth?tab=register" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>Register Free & Order</Link>
              <a href={`https://wa.me/${BRAND.whatsapp}?text=Hello%2C%20I%20want%20to%20place%20a%20print%20order`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                💬 WhatsApp us first
              </a>
            </div>
          </div>
        </section>

          </div>{/* end right content */}
        </div>{/* end sidebar layout */}

      </main>
      <Footer />

      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        .trust-track {
          display: flex;
          width: max-content;
          animation: trustScroll 35s linear infinite;
        }
        @keyframes trustScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }

        /* ── 1024px ── */
        @media (max-width: 1024px) {
          .cat-products-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .featured-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .best-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .services-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }

        /* ── 900px (tablet) ── */
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .hero-right { display: none !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .why-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .kits-grid { grid-template-columns: 1fr !important; }
          .kits-grid > div { transform: none !important; }
          .clients-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .clients-inner-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .test-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .affiliate-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .cat-products-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .featured-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .best-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* ── 600px (large mobile) ── */
        @media (max-width: 600px) {
          .hero-grid { padding: 0 !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .why-grid { grid-template-columns: 1fr !important; }
          .test-strip { grid-template-columns: 1fr !important; }
          .clients-inner-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .cat-products-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .featured-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .best-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .kits-grid { grid-template-columns: 1fr !important; }
          .hero-stats { flex-direction: column !important; gap: 16px !important; }
          .hero-cta-row { flex-direction: column !important; }
          .hero-cta-row a { width: 100% !important; text-align: center !important; }
        }

        /* ── 480px (mobile) ── */
        @media (max-width: 480px) {
          .services-grid { grid-template-columns: 1fr !important; }
          .cat-products-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .featured-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .best-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .clients-inner-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .flash-sale-bar { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
        }
        @media (max-width: 860px) {
          .sidebar-layout { flex-direction: column !important; }
          .sidebar-layout > aside { width: 100% !important; position: static !important; max-height: none !important; }
        }
      ` }} />
    </>
  )
}