'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ShoppingBag, MapPin, CreditCard, Check, Upload } from 'lucide-react'
import Script from 'next/script'

const STEPS = ['Review', 'Delivery', 'Payment']

const BANK_DETAILS = {
  bankName: 'MoniePoint',
  accountNumber: '6727587825',
  accountName: 'C-Chu Media Limited',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCartStore()

  // ── ALL HOOKS AT THE TOP ─────────────────────────────────────
  const [step, setStep] = useState(0)
  const [session, setSession] = useState<any>(null)
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Delivery
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'local' | 'interstate'>('pickup')
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
  const [address, setAddress] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'bank'>('paystack')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Promo
  const [paystackReady, setPaystackReady] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)

  // ── DERIVED VALUES ───────────────────────────────────────────
  const subtotal = totalPrice()
  const deliveryFee = selectedDelivery?.price || 0
  const promoDiscount = promoApplied
    ? promoApplied.type === 'percentage'
      ? Math.round(subtotal * promoApplied.value / 100)
      : promoApplied.value
    : 0
  const total = subtotal + deliveryFee - promoDiscount
  const filteredDelivery = deliveryOptions.filter(d => d.type === deliveryType)

  // ── EFFECTS ──────────────────────────────────────────────────
  useEffect(() => {
    if (items.length === 0) { router.push('/cart'); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth?tab=login'); return }
      setSession(session)
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setFirstName(data.first_name || '')
            setLastName(data.last_name || '')
            setPhone(data.phone || '')
            setEmail(data.email || '')
          }
        })
    })
    supabase.from('delivery_settings').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setDeliveryOptions(data) })
  }, [])

  // ── HANDLERS ─────────────────────────────────────────────────
  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('is_active', true)
      .single()
    if (error || !data) {
      toast.error('Invalid or expired promo code')
      setPromoApplied(null)
    } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error('This promo code has expired')
      setPromoApplied(null)
    } else if (data.max_uses && data.uses >= data.max_uses) {
      toast.error('This promo code has reached its usage limit')
      setPromoApplied(null)
    } else if (data.min_order && subtotal < data.min_order) {
      toast.error(`Minimum order of ₦${Number(data.min_order).toLocaleString()} required`)
      setPromoApplied(null)
    } else {
      setPromoApplied(data)
      toast.success(`Promo applied! ${data.type === 'percentage' ? `${data.value}% off` : `₦${Number(data.value).toLocaleString()} off`}`)
    }
    setPromoLoading(false)
  }

  const saveOrder = async (paystackRef?: string, status = 'pending') => {
    let receiptUrl = null
    if (receiptFile) {
      const path = `receipts/${crypto.randomUUID()}-${receiptFile.name}`
      const { error: upErr } = await supabase.storage.from('products').upload(path, receiptFile)
      if (!upErr) {
        const { data } = supabase.storage.from('products').getPublicUrl(path)
        receiptUrl = data.publicUrl
      }
    }

    const { data: order, error } = await supabase.from('orders').insert({
      user_id: session.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      shipping_method: deliveryType === 'pickup' ? 'pickup' : 'home',
      address_line1: address || selectedDelivery?.address || '',
      state: deliveryType === 'interstate' ? selectedDelivery?.state : 'FCT',
      delivery_area: selectedDelivery?.name || '',
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: total,
      status,
      paystack_reference: paystackRef || null,
      receipt_url: receiptUrl,
    }).select().single()

    if (error) throw error

    await supabase.from('order_items').insert(
      items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: 1,
        specs: item.specs || {},
        design_type: item.design?.type || null,
        design_file_url: item.design?.fileUrl || null,
        design_link: item.design?.link || null,
        design_brief: item.design?.brief || null,
      }))
    )

    // Send email + WhatsApp via server-side API route (fire-and-forget)
    const shortId = order.id.slice(0, 8).toUpperCase()
    const itemNames = items.map(i => `${i.name} (${i.displayQty})`).join(', ')
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: shortId,
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        customerPhone: phone,
        total: order.total_amount,
        items: itemNames,
        itemsArr: items.map(i => ({ name: i.name, displayQty: i.displayQty, price: i.price })),
        subtotal,
        deliveryFee,
        deliveryArea: selectedDelivery?.name || (deliveryType === 'pickup' ? 'Pickup' : ''),
        address,
        paymentMethod,
        paystackRef: paystackRef || null,
      })
    }).catch(err => console.error('Notify failed:', err))

    return order
  }

  const handlePaystackSuccess = async (ref: any) => {
    setIsProcessing(true)
    try {
      const order = await saveOrder(ref.reference, 'paid')
      clearCart()
      if (promoApplied) {
        await supabase.from('promo_codes').update({ uses: promoApplied.uses + 1 }).eq('id', promoApplied.id)
      }
      router.push(`/checkout/success?order=${order.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Order failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBankPayment = async () => {
    if (!receiptFile) { toast.error('Please upload your payment receipt'); return }
    setIsProcessing(true)
    try {
      const order = await saveOrder(undefined, 'pending')
      clearCart()
      if (promoApplied) {
        await supabase.from('promo_codes').update({ uses: promoApplied.uses + 1 }).eq('id', promoApplied.id)
      }
      router.push(`/checkout/success?order=${order.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Order failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const initPaystack = () => {
    if (!email) { toast.error('Please enter your email address'); return }
    if (!selectedDelivery) { toast.error('Please select a delivery option first'); return }

    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    if (!paystackKey) {
      toast.error('Payment not configured — contact support.')
      return
    }

    // @ts-ignore
    const PaystackPop = window.PaystackPop
    if (!PaystackPop) {
      // Script not yet loaded — load it now and retry
      const existing = document.getElementById('paystack-script')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'paystack-script'
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.onload = () => initPaystack()
        document.head.appendChild(script)
      } else {
        toast('Payment is loading, please try again in a moment')
      }
      return
    }

    try {
      // @ts-ignore
      const handler = PaystackPop.setup({
        key: paystackKey,
        email,
        amount: Math.round(total * 100),
        currency: 'NGN',
        ref: `PRINTHUB-${Date.now()}`,
        callback: (response: any) => handlePaystackSuccess(response),
        onClose: () => toast('Payment window closed'),
      })
      handler.openIframe()
    } catch (err: any) {
      console.error('Paystack error:', err)
      toast.error(err?.message || 'Payment failed to open. Please try again.')
    }
  }

  // ── EARLY RETURN (after all hooks) ───────────────────────────
  if (items.length === 0) return null

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main style={{ background: 'var(--bg-secondary)', padding: '40px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? '#10b981' : i === step ? 'var(--red)' : 'var(--border-color)', color: i <= step ? 'white' : 'var(--text-secondary)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: i === step ? 700 : 400, color: i === step ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'Montserrat' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 60, height: 2, background: i < step ? '#10b981' : 'var(--border-color)', margin: '0 8px', marginBottom: 22 }} />}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }} className="co-layout">
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 28 }}>

              {/* STEP 0: Review */}
              {step === 0 && (
                <div>
                  <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                    <ShoppingBag size={18} color="var(--red)" /> Review your order
                  </h2>
                  {items.map(item => (
                    <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Qty: {item.displayQty}</div>
                        {item.specs && Object.entries(item.specs).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 11, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '2px 8px', color: 'var(--text-secondary)', marginRight: 4, display: 'inline-block', marginBottom: 2 }}>{k}: {String(v)}</span>
                        ))}
                        {item.design?.type && (
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                            {item.design.type === 'upload' ? '✓ Design uploaded' : item.design.type === 'link' ? '✓ Design link provided' : '✓ Design brief submitted'}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--red)', flexShrink: 0 }}>₦{Number(item.price).toLocaleString()}</div>
                    </div>
                  ))}
                  <button onClick={() => setStep(1)} style={{ marginTop: 24, width: '100%', padding: '13px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    Continue to Delivery
                  </button>
                </div>
              )}

              {/* STEP 1: Delivery */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                    <MapPin size={18} color="var(--red)" /> Delivery details
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { type: 'pickup', label: '🏪 Pickup', sub: 'Free' },
                      { type: 'local', label: '🛵 Abuja', sub: 'Local delivery' },
                      { type: 'interstate', label: '🚚 Interstate', sub: 'Nationwide' },
                    ].map(opt => (
                      <div key={opt.type} onClick={() => { setDeliveryType(opt.type as any); setSelectedDelivery(null) }}
                        style={{ padding: '12px', borderRadius: 10, border: `2px solid ${deliveryType === opt.type ? 'var(--red)' : 'var(--border-color)'}`, background: deliveryType === opt.type ? 'var(--red-pale)' : 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'center' as const }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: deliveryType === opt.type ? 'var(--red)' : 'var(--text-primary)', marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
                      {deliveryType === 'pickup' ? 'Select pickup location' : deliveryType === 'local' ? 'Select your area' : 'Select your state'}
                    </label>
                    <select value={selectedDelivery?.id || ''} onChange={e => { const opt = filteredDelivery.find(d => d.id === e.target.value); setSelectedDelivery(opt || null) }} className="form-input" style={{ cursor: 'pointer' }}>
                      <option value="">-- Select --</option>
                      {filteredDelivery.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}{opt.price > 0 ? ` — ₦${Number(opt.price).toLocaleString()}` : ' — FREE'}</option>
                      ))}
                    </select>
                    {selectedDelivery && (
                      <div style={{ marginTop: 8, fontSize: 13, color: selectedDelivery.price === 0 ? '#10b981' : 'var(--text-primary)', fontWeight: 600 }}>
                        {selectedDelivery.price === 0 ? 'Free pickup' : `Delivery fee: ₦${Number(selectedDelivery.price).toLocaleString()}`}
                        {selectedDelivery.address && <div style={{ fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedDelivery.address}</div>}
                      </div>
                    )}
                  </div>
                  {deliveryType !== 'pickup' && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, marginBottom: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-primary)' }}>First name</label>
                          <input value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-primary)' }}>Last name</label>
                          <input value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-primary)' }}>Phone</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} className="form-input" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-primary)' }}>Delivery address</label>
                        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="House number, street, landmark" className="form-input" />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={() => setStep(0)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Back</button>
                    <button onClick={() => { if (!selectedDelivery) { toast.error('Please select a delivery option'); return } setStep(2) }}
                      style={{ flex: 2, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Payment */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                    <CreditCard size={18} color="var(--red)" /> Payment
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {[
                      { method: 'paystack', label: '💳 Pay Online', sub: 'Card, transfer, USSD via Paystack' },
                      { method: 'bank', label: '🏦 Bank Transfer', sub: 'Pay to our account, upload receipt' },
                    ].map(opt => (
                      <div key={opt.method} onClick={() => setPaymentMethod(opt.method as any)}
                        style={{ padding: '16px', borderRadius: 10, border: `2px solid ${paymentMethod === opt.method ? 'var(--red)' : 'var(--border-color)'}`, background: paymentMethod === opt.method ? 'var(--red-pale)' : 'var(--bg-secondary)', cursor: 'pointer' }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: paymentMethod === opt.method ? 'var(--red)' : 'var(--text-primary)', marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>

                  {paymentMethod === 'bank' && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>Bank Account Details</div>
                        {[
                          { label: 'Bank', value: BANK_DETAILS.bankName },
                          { label: 'Account Number', value: BANK_DETAILS.accountNumber },
                          { label: 'Account Name', value: BANK_DETAILS.accountName },
                          { label: 'Amount', value: `₦${total.toLocaleString()}` },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>Upload payment receipt *</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '2px dashed var(--border-color)', borderRadius: 9, cursor: 'pointer', background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <Upload size={16} />
                          <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                          {receiptFile ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ {receiptFile.name}</span> : 'Click to upload screenshot or PDF'}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Promo code */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Promo / Discount Code</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="Enter promo code" className="form-input" style={{ flex: 1, textTransform: 'uppercase' as const }} disabled={!!promoApplied} />
                      <button onClick={promoApplied ? () => { setPromoApplied(null); setPromoCode('') } : applyPromo} disabled={promoLoading}
                        style={{ padding: '10px 16px', background: promoApplied ? '#10b981' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                        {promoApplied ? '✓ Applied' : promoLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {promoApplied && (
                      <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 600 }}>
                        {promoApplied.type === 'percentage' ? `${promoApplied.value}% discount` : `₦${Number(promoApplied.value).toLocaleString()} discount`} applied
                        <button onClick={() => { setPromoApplied(null); setPromoCode('') }} style={{ marginLeft: 8, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
                      </div>
                    )}
                  </div>

                  {paymentMethod === 'paystack' && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-primary)' }}>Email for receipt *</label>
                      <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="form-input" placeholder="your@email.com" />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Back</button>
                    {paymentMethod === 'paystack' ? (
                      <button onClick={initPaystack} disabled={isProcessing}
                        style={{ flex: 2, padding: '12px', background: isProcessing ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <CreditCard size={16} />
                        {isProcessing ? 'Processing...' : !paystackReady ? 'Loading payment...' : `Pay ₦${total.toLocaleString()} via Paystack`}
                      </button>
                    ) : (
                      <button onClick={handleBankPayment} disabled={isProcessing}
                        style={{ flex: 2, padding: '12px', background: isProcessing ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                        {isProcessing ? 'Processing Payment...' : 'Confirm Bank Transfer Order'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 20, position: 'sticky' as const, top: 80 }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-primary)' }}>Summary</h3>
              {items.map(item => (
                <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-secondary)', maxWidth: 140 }}>{item.name} ({item.displayQty})</span>
                  <span style={{ fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>₦{Number(item.price).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₦{subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delivery</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDelivery ? (deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`) : 'TBD'}</span>
                </div>
                {promoApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#10b981' }}>Discount</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>-₦{promoDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ color: 'var(--red)' }}>₦{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <Script
        id="paystack-script"
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
        onLoad={() => setPaystackReady(true)}
      />
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 900px) { .co-layout { grid-template-columns: 1fr !important; } }` }} />
    </>
  )
}