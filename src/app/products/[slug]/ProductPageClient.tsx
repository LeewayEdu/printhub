// src/app/products/[slug]/ProductPageClient.tsx
'use client'

import { visibleBadge } from '@/lib/catalog'
import { BRAND } from '@/lib/constants'
import { yearsLabel } from '@/lib/company'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Heart, Share2, ChevronDown, ChevronUp, Star, MessageCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import type { DesignPricingResolved } from '@/store/cartStore'
import LiveCalculatorV2, { type TierRow } from '@/components/shop/LiveCalculatorV2'
import DesignPricingFlow from '@/components/shop/DesignPricingFlow'
import { Breadcrumbs } from '@/components/seo'
import { fbTrack } from '@/lib/meta-pixel'
import toast from 'react-hot-toast'
import SiteImage from '@/components/ui/SiteImage'

interface Props {
  product: any
  relatedProducts: any[]
  faqs: { question: string; answer: string }[]
  breadcrumbs: { name: string; href?: string }[]
  marketingTags: { label: string; slug: string }[]
}

export default function ProductPageClient({ product, relatedProducts, faqs, breadcrumbs, marketingTags }: Props) {
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(product.moq || 1)
  const [widthIn, setWidthIn] = useState<number>(product.min_width || 1)
  const [heightIn, setHeightIn] = useState<number>(product.min_height || 1)
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  const [specs, setSpecs] = useState<Record<string, string>>({})
  const [resolvedPriceModel, setResolvedPriceModel] = useState('unit')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [wishlisted, setWishlisted] = useState(false)
  const [tierRows, setTierRows] = useState<TierRow[]>([])

  // Design pricing state
  const [designPricingResolved, setDesignPricingResolved] = useState<DesignPricingResolved | null>(null)
  const [linkedAddons, setLinkedAddons] = useState<any[]>([])

  const hasDesignPricing = product.design_pricing_type && product.design_pricing_type !== 'none'

  const { addToCart } = useCartStore()

  useEffect(() => {
    fbTrack('ViewContent', {
      content_name: product.name,
      value: product.display_price || product.price || 0,
      currency: 'NGN',
    })
  }, [product.id])

  // Fetch linked design addons for 'dependent' type products
  useEffect(() => {
    if (product.design_pricing_type !== 'dependent') return
    supabase
      .from('product_design_addons')
      .select('id, gate_question, gate_when_answer, design_addons(name, price, description)')
      .eq('product_id', product.id)
      .then(({ data }) => { if (data) setLinkedAddons(data) })
  }, [product.id, product.design_pricing_type])

  const images = product.images?.length ? product.images
    : product.image_url ? [product.image_url] : []

  const printPrice = calculatedPrice || product.display_price || product.price || 0
  const designCost = designPricingResolved?.designCostTotal ?? 0
  const totalPrice = printPrice + designCost

  // The button is never disabled. Until a price exists it explains why, in plain
  // sight beside the button, and clicking it repeats the reason.
  const hasPrice = !!calculatedPrice || !!product.is_fixed_price

  const handleAddToCart = () => {
    if (!hasPrice) {
      toast.error('Choose your options first so we can work out the price')
      return
    }
    const finalPrintPrice = calculatedPrice || product.display_price || product.price || 0
    const displayQty = ['area', 'area_sqin'].includes(resolvedPriceModel)
      ? `${qty} piece${qty !== 1 ? 's' : ''}`
      : `${qty} pcs`
    addToCart(
      product.id,
      product.name,
      finalPrintPrice,
      displayQty,
      specs,
      hasDesignPricing
        ? (designPricingResolved ?? { hasOwnDesign: true, designCostTotal: 0, designAddons: [] })
        : null,
    )
    toast.success(designPricingResolved?.hasOwnDesign === false || !hasDesignPricing
      ? 'Added to cart'
      : 'Added to cart. You can upload your design file in the cart.')
  }

  // Pre-filled WhatsApp message: product, chosen options, quantity, total and page link.
  const buildWhatsAppUrl = () => {
    const options = Object.entries(specs).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
    const lines = [
      "Hello, I'm interested in ordering:",
      '',
      `Product: ${product.name}`,
      options ? `Options: ${options}` : '',
      `Quantity: ${qty}`,
      calculatedPrice ? `Estimated total: ₦${totalPrice.toLocaleString()}` : '',
      `Link: ${window.location.origin}/products/${product.slug}`,
      '',
      'Please confirm availability and delivery timeline.',
    ].filter((l, i, arr) => l !== '' || (arr[i - 1] !== '' && i !== 0))
    return `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const handleWhatsApp = () => {
    window.open(buildWhatsAppUrl(), '_blank', 'noopener')
  }

  // Tells the rest of the page (chat launcher, consent banner) to sit above the mobile bar
  useEffect(() => {
    document.body.classList.add('has-buy-bar')
    return () => document.body.classList.remove('has-buy-bar')
  }, [])

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
              ? <SiteImage src={images[activeImage]} alt={product.name} width={800} height={800} sizes="(max-width: 768px) 100vw, 50vw" priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🖨️</div>
            }
            {visibleBadge(product) && (
              <div style={{ position: 'absolute' as const, top: 16, left: 16, background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
                {visibleBadge(product)}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImage(i)}
                  style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: `2px solid ${activeImage === i ? 'var(--red)' : 'transparent'}`, background: '#f7f7f5', cursor: 'pointer', padding: 0 }}>
                  <SiteImage src={img} alt={`${product.name} view ${i + 1}`} width={64} height={64} sizes="64px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

          {/* Marketing category tags */}
          {marketingTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
              {marketingTags.map(tag => (
                <Link key={tag.slug} href={`/shop?cat=${encodeURIComponent(tag.label)}`}
                  style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '2px 10px', textDecoration: 'none', fontFamily: 'Open Sans' }}>
                  {tag.label}
                </Link>
              ))}
            </div>
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

          {/* Price: one primary figure (live total), per-piece price as small secondary text */}
          {(calculatedPrice || product.display_price || product.price) ? (
            <div style={{ marginBottom: 20 }} aria-live="polite">
              {calculatedPrice ? (
                <>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30, color: 'var(--red)', lineHeight: 1.1 }}>
                    ₦{totalPrice.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                    {qty > 1 && <>₦{Math.round(printPrice / qty).toLocaleString()} per piece · </>}
                    {qty} {qty === 1 ? 'piece' : 'pieces'} · VAT inclusive
                  </div>
                  {hasDesignPricing && designPricingResolved && !designPricingResolved.hasOwnDesign && (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8 }}>
                      Print ₦{printPrice.toLocaleString()}
                      {designCost > 0 ? <> <strong>+ ₦{designCost.toLocaleString()} design fee</strong></> : <> · design included</>}
                    </div>
                  )}
                  {hasDesignPricing && designPricingResolved?.hasOwnDesign && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 6 }}>No design fee. Upload your file in the cart.</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>Starting from</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30, color: 'var(--red)' }}>
                    ₦{Number(product.display_price || product.price).toLocaleString()}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Live calculator */}
          <div style={{ marginBottom: 24 }}>
            <LiveCalculatorV2
              category={product.product_type || product.category}
              productName={product.name}
              qty={qty}
              widthFt={widthIn}
              heightFt={heightIn}
              minWidth={product.min_width || 0.1}
              minHeight={product.min_height || 0.1}
              minOrderAmount={product.min_order_amount || undefined}
              hideTotal
              moq={product.moq || 1}
              increment={product.increment || 1}
              maxQty={product.max_qty || null}
              onTierTable={setTierRows}
              onDimensionChange={(axis, value) => {
                if (axis === 'width') setWidthIn(value)
                else setHeightIn(value)
              }}
              onPriceUpdate={(total, specSummary) => {
                setCalculatedPrice(total)
                setSpecs(specSummary)
              }}
              onPriceModelResolved={setResolvedPriceModel}
            />
          </div>

          {/* Quantity selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              Quantity (min {product.moq || 1})
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button aria-label="Decrease quantity"
                onClick={() => setQty((q: number) => Math.max(product.moq || 1, q - (product.increment || 1)))}
                disabled={qty <= (product.moq || 1)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: '#f7f7f5', cursor: qty <= (product.moq || 1) ? 'not-allowed' : 'pointer', fontSize: 18, opacity: qty <= (product.moq || 1) ? 0.4 : 1 }}>−</button>
              <input aria-label="Quantity" type="number" value={qty} min={product.moq || 1} step={product.increment || 1}
                onChange={e => setQty(Math.max(product.moq || 1, Number(e.target.value)))}
                style={{ width: 72, textAlign: 'center' as const, padding: '8px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16 }} />
              <button aria-label="Increase quantity" onClick={() => setQty((q: number) => q + (product.increment || 1))}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: '#f7f7f5', cursor: 'pointer', fontSize: 18 }}>+</button>
            </div>
          </div>

          {/* Bulk pricing: real tiers from the pricing engine, figures for the options chosen above */}
          {tierRows.length > 1 && (() => {
            const activeIdx = Math.max(0, tierRows.findIndex(r => qty >= r.minQty && (r.maxQty === null || qty <= r.maxQty)))
            const next = tierRows[activeIdx + 1]
            const currentEach = calculatedPrice && qty ? printPrice / qty : 0
            const saving = next && currentEach ? Math.round(currentEach * next.qty - next.total) : 0
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>Bulk pricing</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                  <tbody>
                    {tierRows.map((r, i) => (
                      <tr key={r.qty} style={{ background: i === activeIdx ? 'rgba(192,57,43,0.08)' : 'transparent', fontWeight: i === activeIdx ? 700 : 400 }}>
                        <td style={{ padding: '6px 10px', borderRadius: '6px 0 0 6px' }}>{r.qty} pcs{r.discountPct > 0 ? ` · ${r.discountPct}% off` : ''}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' as const, borderRadius: '0 6px 6px 0' }}>₦{r.each.toLocaleString()} each</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {next && qty < next.qty && saving > 0 && (
                  <div style={{ fontSize: 13, color: '#047857', marginTop: 6 }}>
                    Order {(next.qty - qty).toLocaleString()} more to save ₦{saving.toLocaleString()}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Design pricing flow — shown when product has design pricing configured */}
          {hasDesignPricing && (
            <DesignPricingFlow
              product={product}
              linkedAddons={linkedAddons}
              resolved={designPricingResolved}
              onResolved={setDesignPricingResolved}
              onReset={() => setDesignPricingResolved(null)}
            />
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              onClick={handleAddToCart}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 20px', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', background: 'var(--red)', color: 'white',
              }}>
              <ShoppingCart size={18} />
              Add to cart
            </button>
            <button aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wishlisted} onClick={() => setWishlisted(w => !w)}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={18} color={wishlisted ? 'var(--red)' : 'var(--gray)'} fill={wishlisted ? 'var(--red)' : 'none'} />
            </button>
            <button aria-label="Share this product" onClick={handleShare}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={18} color="var(--gray)" />
            </button>
          </div>

          {!hasPrice && (
            <div role="status" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Choose your options above to see the price.
            </div>
          )}

          <button onClick={handleWhatsApp}
            style={{ width: '100%', padding: '13px', background: '#25D366', color: 'white', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            💬 Order via WhatsApp
          </button>

          {/* Trust row */}
          <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-primary)' }}>
            <li>🔄 Free reprint if the error is ours</li>
            <li>🔒 Secure payment via Paystack</li>
            <li>⭐ {yearsLabel()} · {BRAND.stats.jobs} jobs delivered</li>
          </ul>

          {/* Turnaround and delivery. Shown only when the product has a stored turnaround;
              no generic turnaround is stored anywhere, so none is invented. */}
          {product.turnaround_time && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              ⏱️ Typical turnaround: {product.turnaround_time} · Pickup in Karu or nationwide delivery
            </div>
          )}
          {product.delivery_information && (
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>🚚 {product.delivery_information}</div>
          )}
        </div>
      </div>

      {/* ── Sticky mobile buy bar (screens under 768px) ── */}
      <div className="mobile-buy-bar" role="region" aria-label="Order summary">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>{calculatedPrice ? 'Total' : 'From'}</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)', lineHeight: 1.1 }}>
            ₦{(calculatedPrice ? totalPrice : Number(product.display_price || product.price || 0)).toLocaleString()}
          </div>
        </div>
        <button onClick={handleAddToCart}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 14px', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: 'var(--red)', color: 'white' }}>
          <ShoppingCart size={16} /> Add to cart
        </button>
        <button onClick={handleWhatsApp} aria-label="Chat on WhatsApp about this product"
          style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 10, border: 'none', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <MessageCircle size={22} />
        </button>
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
                      ? <SiteImage src={p.images?.[0] || p.image_url} alt={p.name} width={400} height={400} sizes="(max-width: 768px) 50vw, 25vw" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
