'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { ProductCard as SharedProductCard, ShopSidebar, ProductCardData } from '@/components/shop/ShopComponents'
import LiveCalculatorV2 from '@/components/shop/LiveCalculatorV2'
import { getCategories } from '@/lib/categories'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart, Search, ChevronLeft, ChevronRight, Minus, Plus, Upload, Link as LinkIcon, Pen, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface SpecOption { label: string; price: number }
interface SpecGroup { name: string; options: SpecOption[] }
interface QtyTier { qty: number; multiplier: number }
interface ProductPreset {
  label: string
  badge?: string
  selections: {
    specs?: Record<string, string>
    addons?: string[]
  }
}
export interface Product {
  id: string; name: string; description: string; category: string
  pricing_model: string; price: number; moq: number; increment: number
  max_qty: number | null; qty_tiers: QtyTier[]; area_rate: number
  area_unit: string; min_width: number; min_height: number
  spec_groups: SpecGroup[]; featured: boolean; badge: string
  images: string[]; image_url: string; is_active: boolean; created_at: string
  display_price?: number
  is_fixed_price?: boolean
  sort_order: number | null
  product_type?: string
  presets?: ProductPreset[]
  slug?: string
  min_order_amount?: number | null
  // Fields required by ProductCardData
  discount_type: string | null
  discount_value: number | null
  rating: number
  review_count: number
  total_orders: number
}

interface MarketingCategory {
  id: string
  label: string
  slug: string
  icon: string
}

interface HeroBanner {
  id: string
  image_url: string
  title?: string
  subtitle?: string
  link_url?: string
}

// Fallback price calculator — used ONLY as a placeholder before LiveCalculatorV2's
// first calculation lands (calcPrice is null momentarily on open), and for
// is_fixed_price products which skip the calculator entirely.
// This does NOT enforce min_width/min_height — that enforcement lives solely in
// priceEngineV2.calculate(), which is what actually prices area-based products.
// Do not extend this function with area-based logic; it is legacy and intentionally inert there.
function calculatePrice(p: Product, qty: number, specs: Record<string, SpecOption>, w?: number, h?: number): number {
  const specTotal = Object.values(specs).reduce((s, o) => s + (o?.price || 0), 0)
  const base = p.price + specTotal
  if (p.is_fixed_price) return Math.round(base * qty)
  const tiers = [...(p.qty_tiers || [])].sort((a, b) => a.qty - b.qty)
  if (!tiers.length || qty <= p.moq) return base
  let mult = 1
  for (const tier of tiers) { if (qty >= tier.qty) mult = tier.multiplier }
  return Math.round(base * mult)
}

function getImages(p: Product): string[] {
  if (p.images?.length) return p.images
  if (p.image_url) return [p.image_url]
  return []
}

export default function ShopPageClient({
  initialProducts,
  heroBanners,
  marketingCategories,
  productTags,
  catCounts,
  catIcons,
  initialCat,
  initialSearch,
}: {
  initialProducts: Product[]
  heroBanners: HeroBanner[]
  marketingCategories: MarketingCategory[]
  productTags: Record<string, string[]>
  catCounts: Record<string, number>
  catIcons: Record<string, string>
  initialCat: string
  initialSearch: string
}) {
  const router = useRouter()
  const products = initialProducts
  const { addToCart } = useCartStore()
  const [search, setSearch] = useState(initialSearch)
  const [cat, setCat] = useState(initialCat)
  const [sort, setSort] = useState('default')
  const [selected, setSelected] = useState<Product | null>(null)

  // Product config state
  const [qty, setQty] = useState(1)
  const [specs, setSpecs] = useState<Record<string, SpecOption>>({})
  const [w, setW] = useState(1)
  const [h, setH] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)

  // Design state
  const [designType, setDesignType] = useState<'upload' | 'link' | 'request' | null>(null)
  const [designFile, setDesignFile] = useState<File | null>(null)
  const [designLink, setDesignLink] = useState('')
  const [designBrief, setDesignBrief] = useState<Record<string, string>>({})
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [calcPrice, setCalcPrice] = useState<number | null>(null)
  const [calcSpecs, setCalcSpecs] = useState<Record<string, string>>({})
  const [calcSummary, setCalcSummary] = useState<string>('')
  const [appliedPreset, setAppliedPreset] = useState<{ specs?: Record<string, string>; addons?: string[] } | null>(null)
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null)
  // Authoritative price model resolved by LiveCalculatorV2 via product_type → categories.price_model.
  // Do NOT use selected.pricing_model (legacy column) for any UI decision — it can disagree
  // with the new pricing-category system and reintroduce the same class of bug fixed earlier.
  const [resolvedPriceModel, setResolvedPriceModel] = useState<string>('unit')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('wishlists').select('product_id').eq('user_id', session.user.id)
          .then(({ data }) => { if (data) setWishlistIds(data.map((w: any) => w.product_id)) })
      }
    })
    // Prefetch pricing categories so LiveCalculatorV2's getCategoryPriceModel()
    // lookup is already warm by the time a customer opens a product modal —
    // avoids a second cold network round-trip on first product open.
    getCategories(true).catch(() => {})
  }, [])

  useEffect(() => {
    if (heroBanners.length <= 1) return
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % heroBanners.length), 4000)
    return () => clearInterval(timer)
  }, [heroBanners])

  // Category filtering is URL-based (/shop?cat=Banners) so each category view
  // has a distinct, indexable, shareable URL. Filtering itself still happens
  // client-side against the already-loaded product list — no re-fetch needed.
  const changeCategory = (newCat: string) => {
    setCat(newCat)
    const params = new URLSearchParams(window.location.search)
    if (newCat === 'All Products') params.delete('cat')
    else params.set('cat', newCat)
    const qs = params.toString()
    router.push(`/shop${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const filtered = products
    .filter(p => {
      const ms = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
      const tags = productTags[p.id] || []
      const mc = cat === 'All Products' || tags.includes(cat)
      return ms && mc
    })
    .sort((a, b) => {
      if (sort === 'price-asc') return (a.price || a.area_rate || 0) - (b.price || b.area_rate || 0)
      if (sort === 'price-desc') return (b.price || b.area_rate || 0) - (a.price || a.area_rate || 0)
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })

  const open = (p: Product) => {
    setSelected(p)
    setQty(p.moq || 1)
    setSpecs({})
    setW(p.min_width || 1)
    setH(p.min_height || 1)
    setImgIdx(0)
    setDesignType(null)
    setDesignFile(null)
    setDesignLink('')
    setDesignBrief({})
    setAppliedPreset(null)
    setActivePresetLabel(null)
    setCalcPrice(null)
    setCalcSpecs({})
    setCalcSummary('')
    setResolvedPriceModel('unit')
  }

  const choosePreset = (preset: ProductPreset) => {
    setAppliedPreset({ ...preset.selections })
    setActivePresetLabel(preset.label)
  }

  const addCart = () => {
    if (!selected) return
    if (!designType) { toast.error('Please select a design option before adding to cart'); return }
    if (designType === 'upload' && !designFile) { toast.error('Please upload your design file'); return }
    if (designType === 'link' && !designLink.trim()) { toast.error('Please enter your design link'); return }
    if (designType === 'request' && !designBrief.businessName) { toast.error('Please enter at least your business name for the design brief'); return }

    const price = calculatePrice(selected, qty, specs, w, h)
    const sl: Record<string, string> = {}
    Object.entries(specs).forEach(([k, v]) => { sl[k] = v.label })

    let displayQty = ''
    if (['area', 'area_sqin'].includes(resolvedPriceModel)) {
      const unit = resolvedPriceModel === 'area_sqin' ? 'in' : 'ft'
      sl['Width'] = `${w}${unit}`
      sl['Height'] = `${h}${unit}`
      displayQty = `${w}×${h} ${resolvedPriceModel === 'area_sqin' ? 'sq.in' : 'sqft'}`
    } else {
      displayQty = `${qty} pcs`
    }

    const finalPrice = calcPrice || price
    const finalSpecs = calcSpecs && Object.keys(calcSpecs).length > 0 ? { ...sl, ...calcSpecs } : sl
    addToCart(selected.id, selected.name, finalPrice, displayQty, finalSpecs)

    if (designType) {
      const state = useCartStore.getState()
      const latest = state.items[state.items.length - 1]
      if (latest) {
        state.updateDesign(latest.cartItemId, {
          type: designType,
          fileUrl: null,
          link: designType === 'link' ? designLink : null,
          brief: designType === 'request' ? designBrief : null,
        })
      }
    }
    setSelected(null)
  }

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{ position: 'relative', overflow: 'hidden', height: 320 }}>
          {heroBanners.length > 0 ? (
            <>
              {heroBanners.map((banner, i) => (
                <div key={banner.id} style={{ position: 'absolute' as const, inset: 0, transition: 'opacity 0.8s ease', opacity: i === heroIdx ? 1 : 0, zIndex: i === heroIdx ? 1 : 0 }}>
                  <img src={banner.image_url} alt={banner.title || 'Banner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                  {(banner.title || banner.subtitle) && (
                    <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '0 clamp(16px, 4vw, 40px)', textAlign: 'center' as const, zIndex: 2 }}>
                      {banner.title && <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', lineHeight: 1.1, marginBottom: 10 }}>{banner.title}</h1>}
                      {banner.subtitle && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>{banner.subtitle}</p>}
                      {banner.link_url && <a href={banner.link_url} style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--red)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Shop Now</a>}
                    </div>
                  )}
                </div>
              ))}
              {heroBanners.length > 1 && (
                <div style={{ position: 'absolute' as const, bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
                  {heroBanners.map((_, i) => (
                    <button key={i} onClick={() => setHeroIdx(i)}
                      style={{ width: i === heroIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === heroIdx ? 'white' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ position: 'absolute' as const, inset: 0, background: 'var(--black)' }} />
              <div style={{ position: 'absolute' as const, inset: 0, backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(192,57,43,0.15) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute' as const, inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
              <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', padding: '0 clamp(16px, 4vw, 40px)', zIndex: 2 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Our services</div>
                  <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', color: 'white', lineHeight: 1.05, marginBottom: 12 }}>
                    Everything you need,<br /><span style={{ color: 'var(--red)' }}>printed with precision.</span>
                  </h1>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, lineHeight: 1.75 }}>Browse our catalogue. Choose specs, see live pricing, add to cart.</p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Shop body */}
        <section style={{ background: 'var(--bg-secondary)', minHeight: '60vh' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0 }} className="shop-layout">

            <div style={{ borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', minHeight: '60vh' }}>
              <ShopSidebar
                categoryMap={catCounts}
                categoryIcons={catIcons}
                activeCategory={cat}
                onCategoryChange={changeCategory}
                mode="filter"
              />
            </div>

            <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
              <div className="shop-search-row" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                <div style={{ position: 'relative' as const, flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="form-input" style={{ paddingLeft: 36, fontSize: 13 }} />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value)} className="form-input" style={{ maxWidth: 160, cursor: 'pointer', fontSize: 13 }}>
                  <option value="default">Recommended</option>
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: Low to high</option>
                  <option value="price-desc">Price: High to low</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {`${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
                {cat !== 'All Products' && <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 600 }}>in {cat}</span>}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No products found</div>
                  <button onClick={() => { setSearch(''); changeCategory('All Products') }}
                    style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 24px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="pg">
                  {filtered.map(p => (
                    <SharedProductCard
                      key={p.id}
                      product={p}
                      onOpen={() => {}}
                      wishlistIds={wishlistIds}
                      marketingTags={productTags[p.id] || []}
                      href={p.slug ? `/products/${p.slug}` : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* PRODUCT MODAL */}
      {selected && (() => {
        const imgs = getImages(selected)
        const price = calculatePrice(selected, qty, specs, w, h)
        const moq = selected.moq || 1
        const inc = selected.increment || 1

        return (
          <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', border: '1px solid #e8e8e5' }}>

              {/* Modal header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8e8e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#ffffff', borderRadius: '16px 16px 0 0' }}>
                <div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                    {(productTags[selected.id] || []).length > 0
                      ? (productTags[selected.id] || []).map(label => (
                          <span key={label} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '1px 8px' }}>{label}</span>
                        ))
                      : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{selected.category}</span>}
                  </div>
                  <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{selected.name}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ flex: 1, overflowY: 'auto' as const, padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="mg">

                  {/* Left: images */}
                  <div>
                    <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)', aspectRatio: '1 / 1', width: '100%', position: 'relative' as const }}>
                      {imgs[imgIdx]
                        ? <img src={imgs[imgIdx]} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>🖨️</div>}
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                            style={{ position: 'absolute' as const, left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <ChevronLeft size={14} />
                          </button>
                          <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                            style={{ position: 'absolute' as const, right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <ChevronRight size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    {imgs.length > 1 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' as const }}>
                        {imgs.map((img, i) => (
                          <div key={i} onClick={() => setImgIdx(i)}
                            style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${imgIdx === i ? 'var(--red)' : 'var(--border-color)'}` }}>
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                    {selected.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10 }}>{selected.description}</p>
                    )}
                  </div>

                  {/* Right: config */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, background: '#ffffff' }}>

                    {/* Quick Pick presets */}
                    {selected.presets && selected.presets.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>
                          Quick Pick
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                          {selected.presets.map((preset, i) => {
                            const isActive = activePresetLabel === preset.label
                            return (
                              <button key={i} onClick={() => choosePreset(preset)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${isActive ? 'var(--red)' : '#e8e8e5'}`, background: isActive ? 'rgba(192,57,43,0.08)' : 'white', color: isActive ? 'var(--red)' : '#555', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                {preset.label}
                                {preset.badge && (
                                  <span style={{ fontSize: 9, background: 'var(--red)', color: 'white', padding: '1px 6px', borderRadius: 10 }}>{preset.badge}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Pick a common configuration, or customise manually below.</div>
                      </div>
                    )}

                    {/* Quantity — shown for ALL products including area-based.
                        Previously hidden for area/area_sqin products on the
                        incorrect assumption that "dimensions drive the order" —
                        but a customer wanting 10 × (4ft×3ft) banners had no way
                        to specify 10 pieces and had to place the same order 10
                        separate times. The price engine already correctly
                        multiplies by qty for area products (rate × area × qty),
                        so this was purely a UI gate causing a real UX problem.
                        Fixed: qty stepper now always visible. Label changes to
                        "Number of Pieces" for area products to distinguish it
                        from the dimension inputs above. */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat', color: 'var(--text-primary)' }}>
                          {['area', 'area_sqin'].includes(resolvedPriceModel) ? 'Number of Pieces' : 'Quantity'}
                        </label>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Min: {moq} · Step: {inc}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => { if (qty - inc >= moq) setQty(qty - inc) }}
                          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e8e8e5', background: '#f7f7f5', cursor: qty <= moq ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty <= moq ? 0.4 : 1 }}>
                          <Minus size={13} color="#1A1A1A" />
                        </button>
                        <input type="number" value={qty} min={moq} step={inc}
                          onChange={e => { const val = Number(e.target.value); if (val >= moq) setQty(val) }}
                          className="no-spinners"
                          style={{ width: 70, textAlign: 'center' as const, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, border: '1px solid #e8e8e5', borderRadius: 8, padding: '6px', background: '#f7f7f5', color: '#1A1A1A', outline: 'none' }}
                        />
                        <button onClick={() => { if (!selected.max_qty || qty + inc <= selected.max_qty) setQty(qty + inc) }}
                          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e8e8e5', background: '#f7f7f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={13} color="#1A1A1A" />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>pcs</span>
                      </div>
                    </div>

                    {/* Design section */}
                    <div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-primary)' }}>
                        Your Design
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>(optional — can send via WhatsApp later)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                        {[
                          { type: 'upload', icon: <Upload size={13} />, label: 'Upload' },
                          { type: 'link', icon: <LinkIcon size={13} />, label: 'Share link' },
                          { type: 'request', icon: <Pen size={13} />, label: 'Request' },
                        ].map(opt => (
                          <button key={opt.type}
                            onClick={() => setDesignType(designType === opt.type as any ? null : opt.type as any)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 6px', borderRadius: 8, border: `2px solid ${designType === opt.type ? 'var(--red)' : 'var(--border-color)'}`, background: designType === opt.type ? '#FDEDEC' : '#f7f7f5', color: designType === opt.type ? 'var(--red)' : 'var(--text-secondary)', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer' }}>
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                      {designType === 'upload' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '2px dashed #e8e8e5', borderRadius: 9, cursor: 'pointer', background: '#f7f7f5', fontSize: 12, color: '#6B6B6B' }}>
                          <Upload size={14} />
                          <input type="file" accept=".png,.jpg,.jpeg,.pdf,.ai,.psd,.cdr" style={{ display: 'none' }}
                            onChange={e => setDesignFile(e.target.files?.[0] || null)} />
                          {designFile ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ {designFile.name}</span> : 'Click to upload (PNG, PDF, AI, PSD, CDR)'}
                        </label>
                      )}
                      {designType === 'link' && (
                        <input value={designLink} onChange={e => setDesignLink(e.target.value)}
                          placeholder="Paste Google Drive, Dropbox or WeTransfer link..."
                          className="form-input" style={{ fontSize: 12 }} />
                      )}
                      {designType === 'request' && (
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
                          {[
                            { field: 'businessName', placeholder: 'Business name' },
                            { field: 'colors', placeholder: 'Preferred colours (e.g. red, black, gold)' },
                            { field: 'slogan', placeholder: 'Slogan or tagline (optional)' },
                            { field: 'notes', placeholder: 'Notes for designer (optional)' },
                          ].map(({ field, placeholder }) => (
                            <input key={field} value={designBrief[field] || ''}
                              onChange={e => setDesignBrief(p => ({ ...p, [field]: e.target.value }))}
                              placeholder={placeholder} className="form-input" style={{ fontSize: 12 }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Calculator V2
                        - category: uses product_type (slug) so engine finds correct spec_options
                        - width/height: passed from parent state, updated via onDimensionChange
                        - dimension inputs now rendered INSIDE the calculator for area-based products
                        - isAreaBased prop retained for backwards compat but no longer drives dimension inputs */}
                    {!selected.is_fixed_price && (
                      <LiveCalculatorV2
                        category={selected.product_type || selected.category}
                        productName={selected.name}
                        qty={qty}
                        widthFt={w}
                        heightFt={h}
                        minWidth={selected.min_width || 0}
                        minHeight={selected.min_height || 0}
                        minOrderAmount={selected.min_order_amount || undefined}
                        applyPreset={appliedPreset}
                        onDimensionChange={(axis, val) => {
                          if (axis === 'width') setW(val)
                          else setH(val)
                        }}
                        onPriceModelResolved={setResolvedPriceModel}
                        onPriceUpdate={(total, specSummary, summaryText) => {
                          setCalcPrice(total)
                          setCalcSpecs(specSummary)
                          setCalcSummary(summaryText)
                        }}
                      />
                    )}

                    {/* Price display — shown only when calculator is not active (fixed-price products).
                        Uses resolvedPriceModel for the dimensions label here too, but since fixed-price
                        products skip the calculator entirely, resolvedPriceModel stays at its 'unit'
                        default — so we fall back to selected.area_unit only for cosmetic labelling,
                        never for calculation. */}
                    {selected.is_fixed_price && (
                      <div style={{ background: '#f7f7f5', borderRadius: 10, padding: '12px 14px', border: '1px solid #e8e8e5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {qty} pcs
                          </span>
                          <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--red)' }}>
                            ₦{(calcPrice || price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10, flexShrink: 0, background: '#ffffff', borderRadius: '0 0 16px 16px' }}>
                <button onClick={() => setSelected(null)}
                  style={{ flex: 1, padding: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
                <button onClick={addCart}
                  style={{ flex: 2, padding: '11px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ShoppingCart size={15} /> Add to Cart — ₦{(calcPrice || price).toLocaleString()}
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) {
          .shop-layout { grid-template-columns: 1fr !important; }
          .shop-layout > div:first-child { display: none !important; }
          .shop-layout > div:last-child { width: 100% !important; padding: 16px !important; box-sizing: border-box !important; }
          .pg { grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
          .mg { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .shop-search-row { flex-direction: column !important; }
          .shop-search-row > * { width: 100% !important; max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .pg { gap: 8px !important; grid-template-columns: repeat(2, 1fr) !important; }
          .card-info { padding: 8px !important; }
          .card-name { font-size: 11px !important; -webkit-line-clamp: 2 !important; }
          .card-category { font-size: 9px !important; }
          .shop-layout > div:last-child { padding: 10px !important; }
        }
        @media (max-width: 600px) {
          .pg { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinners { -moz-appearance: textfield; }
      ` }} />
    </>
  )
}
