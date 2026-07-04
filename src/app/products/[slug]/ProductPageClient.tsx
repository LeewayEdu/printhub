// src/app/products/[slug]/ProductPageClient.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Heart, Share2, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import LiveCalculatorV2 from '@/components/shop/LiveCalculatorV2'
import { Breadcrumbs } from '@/components/seo'
import toast from 'react-hot-toast'

interface Props {
  product: any
  relatedProducts: any[]
  faqs: { question: string; answer: string }[]
  breadcrumbs: { name: string; href?: string }[]
}

export default function ProductPageClient({ product, relatedProducts, faqs, breadcrumbs }: Props) {
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(product.moq || 1)
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  const [specs, setSpecs] = useState<Record<string, string>>({})
  const [resolvedPriceModel, setResolvedPriceModel] = useState('unit')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [wishlisted, setWishlisted] = useState(false)
  const { addToCart } = useCartStore()

  const images = product.images?.length ? product.images
    : product.image_url ? [product.image_url] : []

  const handleAddToCart = () => {
    if (!calculatedPrice && !product.is_fixed_price) {
      toast.error('Please configure your product first')
      return
    }
    const finalPrice = calculatedPrice || product.display_price || product.price || 0
    const displayQty = ['area', 'area_sqin'].includes(resolvedPriceModel)
      ? `${qty} piece${qty !== 1 ? 's' : ''}`
      : `${qty} pcs`
    addToCart(
      product.id,
      product.name,
      finalPrice,
      displayQty,
      specs,
    )
  }

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hello, I'm interested in ordering:\n\n` +
      `Product: ${product.name}\n` +
      `Quantity: ${qty}\n` +
      `${calculatedPrice ? `Estimated Total: ₦${calculatedPrice.toLocaleString()}\n` : ''}` +
      `\nPlease confirm availability and delivery timeline.`
    )
    window.open(`https://wa.me/2348052929523?text=${msg}`, '_blank')
  }

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, url: window.location.href })
    } catch {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)' }}>
      <Breadcrumbs items={breadcrumbs} />

      {/* ── Main product section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 64 }} className="product-main-grid">

        {/* Left: Image gallery */}
        <div>
          <div style={{ borderRadius: 16, overflow: 'hidden', background: '#f7f7f5', aspectRatio: '1/1', marginBottom: 12, position: 'relative' as const }}>
            {images[activeImage]
              ? <img src={images[activeImage]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🖨️</div>
            }
            {product.badge && (
              <div style={{ position: 'absolute' as const, top: 16, left: 16, background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
                {product.badge}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImage(i)}
                  style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: `2px solid ${activeImage === i ? 'var(--red)' : 'transparent'}`, background: '#f7f7f5', cursor: 'pointer', padding: 0 }}>
                  <img src={img} alt={`${product.name} view ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info + calculator */}
        <div>
          {/* Category breadcrumb pill */}
          {product.category && (
            <Link href={`/categories/${product.product_type || ''}`}
              style={{ display: 'inline-block', fontSize: 12, color: 'var(--red)', fontWeight: 600, fontFamily: 'Montserrat', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12, textDecoration: 'none' }}>
              {product.category}
            </Link>
          )}

          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.2 }}>
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={14} color="var(--red)" fill={s <= Math.round(product.rating) ? 'var(--red)' : 'none'} />
              ))}
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>{Number(product.rating).toFixed(1)} ({product.review_count} reviews)</span>
            </div>
          )}

          {/* Short description */}
          {product.short_description && (
            <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 24 }}>
              {product.short_description}
            </p>
          )}

          {/* Price display */}
          {calculatedPrice ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--red)' }}>
                ₦{calculatedPrice.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                {qty} {qty === 1 ? 'piece' : 'pieces'} · VAT inclusive
              </div>
            </div>
          ) : product.display_price || product.price ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>Starting from</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--red)' }}>
                ₦{Number(product.display_price || product.price).toLocaleString()}
              </div>
            </div>
          ) : null}

          {/* Live calculator */}
          <div style={{ marginBottom: 24 }}>
            <LiveCalculatorV2
              category={product.product_type || product.category}
              productName={product.name}
              qty={qty}
              onPriceUpdate={(total, specSummary) => {
                setCalculatedPrice(total)
                setSpecs(specSummary)
              }}
              onPriceModelResolved={setResolvedPriceModel}
            />
          </div>

          {/* Quantity selector — all products including area/dimension-based.
              For area products qty is the piece count ordered at the configured
              dimensions; the price engine already multiplies baseRate × area × qty. */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              Quantity (min {product.moq || 1})
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setQty((q: number) => Math.max(product.moq || 1, q - (product.increment || 1)))}
                disabled={qty <= (product.moq || 1)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: '#f7f7f5', cursor: qty <= (product.moq || 1) ? 'not-allowed' : 'pointer', fontSize: 18, opacity: qty <= (product.moq || 1) ? 0.4 : 1 }}>−</button>
              <input type="number" value={qty} min={product.moq || 1} step={product.increment || 1}
                onChange={e => setQty(Math.max(product.moq || 1, Number(e.target.value)))}
                style={{ width: 72, textAlign: 'center' as const, padding: '8px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16 }} />
              <button onClick={() => setQty((q: number) => q + (product.increment || 1))}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: '#f7f7f5', cursor: 'pointer', fontSize: 18 }}>+</button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={handleAddToCart}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button onClick={() => setWishlisted(w => !w)}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={18} color={wishlisted ? 'var(--red)' : 'var(--gray)'} fill={wishlisted ? 'var(--red)' : 'none'} />
            </button>
            <button onClick={handleShare}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={18} color="var(--gray)" />
            </button>
          </div>

          <button onClick={handleWhatsApp}
            style={{ width: '100%', padding: '13px', background: '#25D366', color: 'white', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            💬 Order via WhatsApp
          </button>

          {/* Turnaround + delivery */}
          {(product.turnaround_time || product.delivery_information) && (
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10 }}>
              {product.turnaround_time && (
                <div style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>⏱️ <strong>Turnaround:</strong> {product.turnaround_time}</div>
              )}
              {product.delivery_information && (
                <div style={{ fontSize: 13, color: '#166534' }}>🚚 <strong>Delivery:</strong> {product.delivery_information}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Full description ── */}
      {product.full_description && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 20 }}>
            About {product.name}
          </h2>
          <div style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.8, maxWidth: 720 }}
            dangerouslySetInnerHTML={{ __html: product.full_description }} />
        </section>
      )}

      {/* ── FAQs ── */}
      {faqs.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 24 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, maxWidth: 720 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: openFaq === i ? '#fef9f9' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{faq.question}</span>
                  {openFaq === i ? <ChevronUp size={16} color="var(--red)" /> : <ChevronDown size={16} color="var(--gray)" />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--gray)', lineHeight: 1.7 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Related products ── */}
      {relatedProducts.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 24 }}>
            You might also need
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="related-grid">
            {relatedProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                  <div style={{ aspectRatio: '1/1', background: '#f7f7f5', overflow: 'hidden' }}>
                    {(p.images?.[0] || p.image_url)
                      ? <img src={p.images?.[0] || p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🖨️</div>
                    }
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
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

      <style>{`
        @media (max-width: 900px) {
          .product-main-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .related-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .related-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}