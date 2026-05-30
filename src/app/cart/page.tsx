'use client'

import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useCartStore } from '@/store/cartStore'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items, removeFromCart, totalPrice, clearCart } = useCartStore()

  if (items.length === 0) return (
    <>
      <Navbar />
      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ textAlign: 'center' as const, padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🛒</div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, marginBottom: 12, color: 'var(--text-primary)' }}>Your cart is empty</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            Browse our services and place your first order.
          </p>
          <Link href="/shop" style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 9, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} /> Browse Shop
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )

  return (
    <>
      <Navbar />
      <main style={{ background: 'var(--bg-secondary)', padding: '40px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, marginBottom: 4, color: 'var(--text-primary)' }}>Your Cart</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }} className="cart-layout">

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {items.map(item => (
                <div key={item.cartItemId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                    🖨️
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Qty: {item.displayQty}</div>
                    {item.specs && Object.keys(item.specs).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                        {Object.entries(item.specs).map(([key, val]) => (
                          <span key={key} style={{ fontSize: 11, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '2px 8px', color: 'var(--text-secondary)' }}>
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.design && (
                      <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
                        {item.design.type === 'upload' ? '✓ Design uploaded' :
                          item.design.type === 'link' ? '✓ Design link provided' :
                            '✓ Design brief submitted'}
                      </div>
                    )}
                
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 12 }}>
                    <button onClick={() => removeFromCart(item.cartItemId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>
                      ₦{Number(item.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={clearCart}
                style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>
                Clear cart
              </button>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 24, position: 'sticky' as const, top: 80 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 20, color: 'var(--text-primary)' }}>Order Summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 20 }}>
                {items.map(item => (
                  <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)', maxWidth: 180 }}>{item.name} ({item.displayQty})</span>
                    <span style={{ fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>₦{Number(item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>₦{totalPrice().toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Delivery fee calculated at checkout</div>
              </div>

              <div style={{ borderTop: '2px solid var(--text-primary)', paddingTop: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--red)' }}>₦{totalPrice().toLocaleString()}</span>
                </div>
              </div>

              <Link href="/checkout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', background: 'var(--red)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Proceed to Checkout <ArrowRight size={18} />
              </Link>

              <Link href="/shop" style={{ display: 'block', textAlign: 'center' as const, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Continue shopping
              </Link>

              <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 9, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Questions? <a href="https://wa.me/2348052929523" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>Chat on WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@media (max-width: 900px) { .cart-layout { grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}