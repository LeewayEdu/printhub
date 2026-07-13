'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useCartStore, type DesignDetails } from '@/store/cartStore'
import { supabase } from '@/lib/supabase/client'
import { Trash2, ShoppingBag, ArrowRight, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PRINT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.ai,.eps,.psd,.cdr'

interface PanelState {
  mode: 'file' | 'link'
  linkValue: string
  notesValue: string
  uploading: boolean
}

const defaultPanel = (): PanelState => ({ mode: 'file', linkValue: '', notesValue: '', uploading: false })

export default function CartPage() {
  const router = useRouter()
  const { items, removeFromCart, totalPrice, clearCart, updateDesign } = useCartStore()
  const [panels, setPanels] = useState<Record<string, PanelState>>({})

  const panel = (id: string): PanelState => panels[id] ?? defaultPanel()

  const patchPanel = (id: string, patch: Partial<PanelState>) =>
    setPanels(p => ({ ...p, [id]: { ...panel(id), ...patch } }))

  const handleFileUpload = async (cartItemId: string, file: File) => {
    patchPanel(cartItemId, { uploading: true })
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `design-files/${cartItemId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('products')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('products').getPublicUrl(path)
      const notes = panel(cartItemId).notesValue.trim()
      updateDesign(cartItemId, {
        type: 'upload',
        fileUrl: data.publicUrl,
        brief: notes ? { notes } : null,
      })
      toast.success('Design file uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed — please try again')
    } finally {
      patchPanel(cartItemId, { uploading: false })
    }
  }

  const handleLinkSave = (cartItemId: string) => {
    const url = panel(cartItemId).linkValue.trim()
    if (!url) { toast.error('Please paste a link first'); return }
    try { new URL(url) } catch { toast.error('Please enter a valid URL (including https://)'); return }
    const notes = panel(cartItemId).notesValue.trim()
    updateDesign(cartItemId, {
      type: 'link',
      link: url,
      brief: notes ? { notes } : null,
    })
    toast.success('Design link saved!')
  }

  const handleClearDesign = (cartItemId: string) => {
    updateDesign(cartItemId, { type: null, fileUrl: null, link: null, brief: null })
    patchPanel(cartItemId, { linkValue: '', notesValue: '' })
  }

  // Items where customer said they have a file, but haven't provided it yet
  const awaitingDesign = items.filter(
    i => i.designPricing?.hasOwnDesign === true && !i.design?.fileUrl && !i.design?.link
  )
  const canCheckout = awaitingDesign.length === 0

  const handleCheckout = () => {
    if (!canCheckout) {
      toast.error(
        `Please upload your design or paste a link for: ${awaitingDesign.map(i => i.name).join(', ')}`
      )
      return
    }
    router.push('/checkout')
  }

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

            {/* ── Item list ── */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {items.map(item => {
                const needsDesign = item.designPricing?.hasOwnDesign === true
                const hasDesign = !!(item.design?.fileUrl || item.design?.link)
                const p = panel(item.cartItemId)
                const isAwaiting = needsDesign && !hasDesign

                return (
                  <div key={item.cartItemId} style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isAwaiting ? '#fbbf24' : 'var(--border-color)'}`,
                    borderRadius: 14,
                    padding: 20,
                  }}>
                    {/* Item header row */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                        🖨️
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Qty: {item.displayQty}</div>
                        {item.specs && Object.keys(item.specs).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                            {Object.entries(item.specs).map(([k, v]) => (
                              <span key={k} style={{ fontSize: 11, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '2px 8px', color: 'var(--text-secondary)' }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Show status for items that don't have a design upload flow */}
                        {!needsDesign && item.design && (
                          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
                            {item.design.type === 'upload' ? '✓ Design uploaded' :
                              item.design.type === 'link' ? '✓ Design link provided' :
                                '✓ Design brief submitted'}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
                        <button onClick={() => removeFromCart(item.cartItemId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
                          <Trash2 size={16} />
                        </button>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>
                          ₦{Number(item.price).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* ── Design upload section (only for items where customer said they have a file) ── */}
                    {needsDesign && (
                      hasDesign ? (
                        /* Design received — show compact success bar */
                        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle size={15} color="#16a34a" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                              {item.design?.type === 'upload' ? 'Design file uploaded' : 'Design link provided'}
                            </span>
                            {item.design?.link && (
                              <a href={item.design.link} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, color: '#166534', textDecoration: 'underline', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, display: 'inline-block' }}>
                                {item.design.link}
                              </a>
                            )}
                          </div>
                          <button onClick={() => handleClearDesign(item.cartItemId)}
                            style={{ fontSize: 12, color: '#166534', background: 'none', border: '1px solid #86efac', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600, flexShrink: 0 }}>
                            Change
                          </button>
                        </div>
                      ) : (
                        /* Upload panel — shown when design file is still needed */
                        <div style={{ marginTop: 14, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                            <AlertCircle size={14} color="#d97706" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Upload your design file to proceed</span>
                          </div>

                          {/* Upload / Link toggle */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            {(['file', 'link'] as const).map(mode => (
                              <button key={mode} onClick={() => patchPanel(item.cartItemId, { mode })}
                                style={{
                                  padding: '7px 14px', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12,
                                  cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s',
                                  ...(p.mode === mode
                                    ? { background: '#92400e', color: 'white', borderColor: '#92400e' }
                                    : { background: 'white', color: '#92400e', borderColor: '#fbbf24' }),
                                }}>
                                {mode === 'file' ? '↑ Upload file' : '🔗 Paste link'}
                              </button>
                            ))}
                          </div>

                          {p.mode === 'file' ? (
                            <label style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                              border: '2px dashed #fbbf24', borderRadius: 9,
                              cursor: p.uploading ? 'not-allowed' : 'pointer',
                              background: 'white', fontSize: 13, color: '#78350f',
                            }}>
                              {p.uploading
                                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} /> Uploading...</>
                                : <><Upload size={15} style={{ flexShrink: 0 }} /> Click to upload (PDF, PNG, AI, PSD, EPS, TIFF…)</>
                              }
                              <input
                                type="file"
                                accept={PRINT_ACCEPT}
                                style={{ display: 'none' }}
                                disabled={p.uploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(item.cartItemId, f) }}
                              />
                            </label>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                value={p.linkValue}
                                onChange={e => patchPanel(item.cartItemId, { linkValue: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') handleLinkSave(item.cartItemId) }}
                                placeholder="https://drive.google.com/… or Dropbox / WeTransfer link"
                                className="form-input"
                                style={{ flex: 1, fontSize: 13 }}
                              />
                              <button onClick={() => handleLinkSave(item.cartItemId)}
                                style={{ padding: '10px 16px', background: '#92400e', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                                Save
                              </button>
                            </div>
                          )}

                          {/* Optional notes */}
                          <div style={{ marginTop: 10 }}>
                            <input
                              value={p.notesValue}
                              onChange={e => patchPanel(item.cartItemId, { notesValue: e.target.value })}
                              placeholder="Notes for the design team (optional)"
                              className="form-input"
                              style={{ fontSize: 12 }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )
              })}

              <button onClick={clearCart}
                style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>
                Clear cart
              </button>
            </div>

            {/* ── Summary sidebar ── */}
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

              <div style={{ borderTop: '2px solid var(--text-primary)', paddingTop: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--red)' }}>₦{totalPrice().toLocaleString()}</span>
                </div>
              </div>

              {/* Design required warning */}
              {awaitingDesign.length > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 4 }}>
                    <AlertCircle size={13} color="#d97706" /> Design file required
                  </div>
                  {awaitingDesign.map(i => (
                    <div key={i.cartItemId} style={{ fontSize: 12, color: '#92400e' }}>• {i.name}</div>
                  ))}
                </div>
              )}

              <button
                onClick={handleCheckout}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px',
                  background: canCheckout ? 'var(--red)' : '#d1d5db',
                  color: canCheckout ? 'white' : '#6b7280',
                  borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15,
                  border: 'none', cursor: canCheckout ? 'pointer' : 'not-allowed',
                }}>
                Proceed to Checkout <ArrowRight size={18} />
              </button>

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
      <style>{`
        @media (max-width: 900px) { .cart-layout { grid-template-columns: 1fr !important; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
