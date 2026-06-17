// Shared shop components — used by homepage and shop page
// This file is imported by 'use client' pages so no directive needed here

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Star, ShoppingCart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// ─── TYPES ────────────────────────────────────────────────────
export interface ProductCardData {
  id: string
  name: string
  category: string
  pricing_model: string
  price: number
  display_price?: number
  is_fixed_price?: boolean
  area_rate: number
  area_unit: string
  images: string[]
  image_url: string
  badge: string | null
  featured: boolean
  discount_type: string | null
  discount_value: number | null
  rating: number
  review_count: number
  total_orders: number
  is_active: boolean
  moq?: number
}

// ─── HELPERS ──────────────────────────────────────────────────
export function displayPrice(p: ProductCardData) {
  if (p.pricing_model === 'area') return `₦${Number(p.area_rate).toLocaleString()}/${p.area_unit}`
  const base = p.display_price || p.price
  if (p.is_fixed_price) return `₦${Number(base).toLocaleString()}`
  return `From ₦${Number(base).toLocaleString()}`
}

export function getDiscountedPrice(p: ProductCardData): { original: number; discounted: number; pct: number } | null {
  if (!p.discount_type || !p.discount_value) return null
  const base = Number(p.display_price || p.price)
  if (!base) return null
  const discounted = p.discount_type === 'percentage'
    ? Math.round(base * (1 - Number(p.discount_value) / 100))
    : Math.max(0, base - Number(p.discount_value))
  const pct = Math.round(((base - discounted) / base) * 100)
  return { original: base, discounted, pct }
}

function getImg(p: ProductCardData) {
  return p.images?.[0] || p.image_url || null
}

function formatSold(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ─── STAR DISPLAY ─────────────────────────────────────────────
export function StarDisplay({ rating, count, size = 12 }: { rating: number; count: number; size?: number }) {
  if (!count) return (
    <span style={{ fontSize: size - 1, color: '#10b981', fontWeight: 700, fontFamily: 'Montserrat' }}>NEW</span>
  )
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {Array(full).fill(0).map((_, i) => <Star key={`f${i}`} size={size} fill="#f59e0b" color="#f59e0b" />)}
        {half && <Star key="h" size={size} fill="url(#half)" color="#f59e0b" />}
        {Array(empty).fill(0).map((_, i) => <Star key={`e${i}`} size={size} fill="none" color="#d1d5db" />)}
      </div>
      <span style={{ fontSize: size - 1, color: '#6b7280', fontFamily: 'Open Sans' }}>
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  )
}

// ─── CARD IMAGE (hover carousel, square 1:1) ─────────────────
// NOTE ON PERFORMANCE: `unoptimized` is set unconditionally below.
// Next.js's built-in image optimizer was measured (via DevTools) taking
// 20-40+ SECONDS per image when fetching from Supabase Storage and
// resizing through Vercel's /image proxy — this was the dominant cause
// of site-wide slowness, not image file size or Supabase itself (files
// were only 10-50KB). Supabase Storage already serves images via CDN,
// so Next's extra optimization step was a slow, unnecessary middleman.
// Do not reintroduce conditional optimization for Supabase URLs without
// first re-measuring in DevTools Network tab — this was a confirmed,
// measured bottleneck, not a guess.
function CardImage({ imgs, name }: { imgs: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (hovering && imgs.length > 1) {
      timerRef.current = setInterval(() => setIdx(i => (i + 1) % imgs.length), 3000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (!hovering) setIdx(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [hovering, imgs.length])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' as const }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}>
      {imgs[idx]
        ? <div style={{ position: 'relative' as const, width: '100%', height: '100%' }}>
            <NextImage
              src={imgs[idx]}
              alt={name}
              fill
              sizes="(max-width: 480px) 45vw, (max-width: 1024px) 25vw, 22vw"
              style={{ objectFit: 'cover', transition: 'opacity 0.35s' }}
              unoptimized
            />
          </div>
        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: '#f5f5f3' }}>🖨️</div>
      }
      {imgs.length > 1 && (
        <div style={{ position: 'absolute' as const, bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
          {imgs.map((_, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === idx ? 'white' : 'rgba(255,255,255,0.45)', display: 'block', transition: 'background 0.3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── WISHLIST HEART ───────────────────────────────────────────
function WishlistHeart({ productId, initialState }: { productId: string; initialState: boolean }) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialState)
  const [loading, setLoading] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast('Login to save to wishlist', { icon: '💡' })
      return
    }

    setLoading(true)
    if (saved) {
      await supabase.from('wishlists').delete().eq('user_id', session.user.id).eq('product_id', productId)
      setSaved(false)
      toast('Removed from wishlist')
    } else {
      await supabase.from('wishlists').upsert({ user_id: session.user.id, product_id: productId })
      setSaved(true)
      toast.success('Saved to wishlist ♡')
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle}
      style={{ position: 'absolute' as const, top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transition: 'transform 0.15s', zIndex: 2 }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
      <Heart size={15} fill={saved ? '#C0392B' : 'none'} color={saved ? '#C0392B' : '#9ca3af'} />
    </button>
  )
}

// ─── PRODUCT CARD ─────────────────────────────────────────────
export function ProductCard({
  product,
  onOpen,
  wishlistIds = [],
}: {
  product: ProductCardData
  onOpen: (p: ProductCardData) => void
  wishlistIds?: string[]
}) {
  const imgs = product.images?.length ? product.images : product.image_url ? [product.image_url] : []

  return (
    <div className="product-card"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>

      {/* Image — square 1:1 */}
      <div className="card-img" style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--bg-secondary)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onOpen(product)}>
        <CardImage imgs={imgs} name={product.name} />

        {/* Badge */}
        {product.badge && (
          <div style={{ position: 'absolute' as const, top: 8, left: 8, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, fontFamily: 'Montserrat', zIndex: 2 }}>
            {product.badge}
          </div>
        )}

        {/* Discount badge */}
        {product.discount_type && product.discount_value && (
          <div style={{ position: 'absolute' as const, top: product.badge ? 32 : 8, left: 8, background: '#10b981', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, fontFamily: 'Montserrat', zIndex: 2 }}>
            {product.discount_type === 'percentage' ? `${product.discount_value}% OFF` : 'SALE'}
          </div>
        )}

        {/* Wishlist heart */}
        <WishlistHeart productId={product.id} initialState={wishlistIds.includes(product.id)} />
      </div>

      {/* Info */}
      <div className="card-info" style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
        {/* Category */}
        <div className="card-category" style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600 }}>
          {product.category}
        </div>

        {/* Name */}
        <div className="card-name" style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
          {product.name}
        </div>

        {/* Stars + sold */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <StarDisplay rating={product.rating || 0} count={product.review_count || 0} />
          {product.total_orders > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'Open Sans' }}>
              {formatSold(product.total_orders)} sold
            </span>
          )}
        </div>

        {/* Price + Discount badge */}
        <div style={{ marginTop: 4 }}>
          {(() => {
            const disc = getDiscountedPrice(product)
            return disc ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 14, color: 'var(--red)' }}>
                    ₦{disc.discounted.toLocaleString()}
                  </span>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 11, color: '#999', textDecoration: 'line-through' }}>
                    ₦{disc.original.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--red)', color: 'white', padding: '1px 5px', borderRadius: 4 }}>
                    -{disc.pct}%
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 14, color: 'var(--red)' }}>
                {displayPrice(product)}
              </div>
            )
          })()}
          {product.moq && product.moq > 1 && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'Open Sans', marginTop: 1 }}>
              Min: {product.moq} pcs
            </div>
          )}
        </div>

        {/* Order button */}
        <button onClick={() => onOpen(product)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 8, transition: 'background 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-dark)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--red)')}>
          <ShoppingCart size={13} /> Order Now
        </button>
      </div>
    </div>
  )
}

// ─── SIDEBAR — dynamic categories from DB ────────────────────
export function ShopSidebar({
  categoryMap,
  activeCategory,
  onCategoryChange,
  categoryIcons,
  mode = 'navigate', // 'navigate' | 'filter'
}: {
  categoryMap: Record<string, number>
  activeCategory: string
  onCategoryChange: (cat: string) => void
  categoryIcons?: Record<string, string>
  mode?: 'navigate' | 'filter'
}) {
  // The category LIST shown here is derived directly from categoryMap's
  // keys — which callers (shop page, homepage) populate from MARKETING
  // categories, not pricing categories. This sidebar previously fetched
  // its own category list internally via getCategories() (the pricing
  // categories table) — that meant the labels shown (Sheet Printing,
  // Apparel & Wearables, etc.) never matched what categoryMap's counts
  // were keyed by, silently breaking counts and showing customers
  // internal pricing-category names. There is no DB fetch in this
  // component anymore; it is purely presentational.
  const total = categoryMap['All Products'] ?? Object.entries(categoryMap)
    .filter(([k]) => k !== 'All Products')
    .reduce((sum, [, v]) => sum + v, 0)

  const cats = [
    { id: 'All Products', label: 'All Products', icon: '🛒' },
    ...Object.keys(categoryMap)
      .filter(k => k !== 'All Products')
      .map(label => ({ id: label, label, icon: categoryIcons?.[label] || '🏷️' })),
  ]

  return (
    <aside style={{ width: '100%' }}>
      <div style={{ background: 'var(--bg-card)' }}>

        {/* Sidebar header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--red)' }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, color: 'white', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            Categories
          </div>
        </div>

        {/* Category list */}
        <div style={{ padding: '8px 0' }}>
          {cats.map(cat => {
            const count = cat.id === 'All Products' ? total : (categoryMap[cat.id] || 0)
            const isActive = activeCategory === cat.id
            return (
              <button key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', background: isActive ? 'rgba(192,57,43,0.08)' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? 'var(--red)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontFamily: 'Open Sans', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--red)' : 'var(--text-primary)' }}>
                    {cat.label}
                  </span>
                </div>
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--red)' : 'var(--text-secondary)', background: isActive ? 'rgba(192,57,43,0.1)' : 'var(--bg-secondary)', padding: '2px 7px', borderRadius: 10, fontFamily: 'Montserrat', flexShrink: 0 }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Quick links */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 4 }}>Quick Links</div>
          {[
            { label: '🚀 Starter Kits', href: '/starter-kits' },
            { label: '🗳️ Campaign Materials', href: '/election-campaign' },
            { label: '📚 Book Publishing', href: '/book-publishing' },
            { label: '💰 Become Affiliate', href: '/affiliate' },
          ].map(link => (
            <Link key={link.href} href={link.href}
              style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'Open Sans', display: 'block', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <a href="https://wa.me/2348052929523?text=Hi%2C%20I%20want%20a%20print%20quote"
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: '#25D366', color: 'white', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
            💬 Quick Quote on WhatsApp
          </a>
        </div>
      </div>
    </aside>
  )
}