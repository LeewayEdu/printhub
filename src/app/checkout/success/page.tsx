'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, Package, MessageCircle } from 'lucide-react'

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      supabase.from('orders').select('*').eq('id', orderId).single()
        .then(({ data }) => { if (data) setOrder(data) })
    }
  }, [orderId])

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '70vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' as const }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#10b98120', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="#10b981" />
          </div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 32, color: 'var(--text-primary)', marginBottom: 12 }}>
            Order Placed!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>
            Thank you for your order. We have received it and will begin processing shortly.
          </p>
          {order && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' as const }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Order ID</span>
                <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--text-primary)' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total</span>
                <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--red)' }}>₦{Number(order.total_amount).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: order.status === 'paid' ? '#10b981' : '#f59e0b', fontFamily: 'Montserrat', textTransform: 'capitalize' as const }}>{order.status}</span>
              </div>
              {order.status === 'pending' && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  Your payment receipt has been submitted. Our team will verify and confirm your order within 2 hours.
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/dashboard/orders"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'var(--red)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              <Package size={16} /> Track Your Order
            </Link>
            <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20just%20placed%20an%20order%20on%20PrintHub"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#25D366', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              <MessageCircle size={16} /> WhatsApp Us
            </a>
          </div>
          <Link href="/shop" style={{ display: 'block', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Continue shopping
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <OrderSuccessContent />
    </Suspense>
  )
}