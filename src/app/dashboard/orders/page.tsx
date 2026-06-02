'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cartStore'
import { RefreshCw, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

const statusColor: Record<string, string> = {
  pending: '#f59e0b', paid: '#3b82f6', processing: '#8b5cf6',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444', refunded: '#6b7280',
}

const statusLabel: Record<string, string> = {
  pending: '⏳ Pending', paid: '💳 Paid', processing: '🏭 In Production',
  shipped: '🚚 Shipped', delivered: '✅ Delivered', cancelled: '❌ Cancelled', refunded: '↩️ Refunded',
}

export default function OrdersPage() {
  const router = useRouter()
  const { addToCart } = useCartStore()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!ordersData) { setLoading(false); return }

    // Join order items for each order
    const withItems = await Promise.all(
      ordersData.map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)
        return { ...order, items: items || [] }
      })
    )

    setOrders(withItems)
    setLoading(false)
  }

  const handleReorder = async (order: any) => {
    if (!order.items?.length) { toast.error('No items found in this order'); return }
    setReordering(order.id)
    let added = 0
    for (const item of order.items) {
      try {
        addToCart(
          item.product_id,
          item.name,
          item.price,
          item.displayQty || `${item.quantity || 1} pcs`,
          item.specs || {},
        )
        added++
      } catch (e) {
        console.error('Could not re-add item:', item.name)
      }
    }
    setReordering(null)
    if (added > 0) {
      toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`)
      router.push('/cart')
    } else {
      toast.error('Could not add items — they may no longer be available')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: 'var(--gray)' }}>Loading your orders...</div>

  if (orders.length === 0) return (
    <div style={{ textAlign: 'center' as const, padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>No orders yet</div>
      <p style={{ color: 'var(--gray)', marginBottom: 24 }}>Your orders will appear here once you place them.</p>
      <Link href="/shop" style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 9, textDecoration: 'none' }}>
        Browse the Shop →
      </Link>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>My Orders</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer', color: 'var(--gray)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
        {orders.map(order => (
          <div key={order.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

            {/* Order summary row */}
            <div onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexWrap: 'wrap' as const, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
                <div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--black)' }}>
                    #{order.job_number || order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                    {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>Total</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--black)' }}>
                    ₦{Number(order.total_amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>Items</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', background: `${statusColor[order.status] || '#999'}20`, color: statusColor[order.status] || '#999' }}>
                  {statusLabel[order.status] || order.status}
                </span>
                <span style={{ fontSize: 18, color: 'var(--gray)', transition: 'transform 0.2s', transform: expanded === order.id ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>⌄</span>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === order.id && (
              <div style={{ borderTop: '1px solid var(--border)', background: 'var(--light)' }}>

                {/* Items list */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Items Ordered</div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' as const }}>
                        <div>
                          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>{item.displayQty || `Qty: ${item.quantity || 1}`}</div>
                          {item.specs && Object.entries(item.specs).length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                              {Object.entries(item.specs).map(([k, v]) => (
                                <span key={k} style={{ fontSize: 11, background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', color: '#555' }}>{k}: {String(v)}</span>
                              ))}
                            </div>
                          )}
                          {item.design_file_url && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>✓ Design file uploaded</div>
                          )}
                          {item.design_link && (
                            <a href={item.design_link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#1d4ed8' }}>✓ Design link provided →</a>
                          )}
                        </div>
                        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>
                          ₦{Number(item.price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order info + actions */}
                <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }} className="order-detail-grid">
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Payment</div>
                    <div style={{ fontSize: 13 }}>{order.paystack_reference ? `Paystack · ${order.paystack_reference}` : 'Bank Transfer'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Delivery</div>
                    <div style={{ fontSize: 13 }}>{order.shipping_method === 'pickup' ? 'Pickup from store' : order.delivery_area || 'Home delivery'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Delivery Fee</div>
                    <div style={{ fontSize: 13, fontFamily: 'Montserrat', fontWeight: 500 }}>{Number(order.delivery_fee) === 0 ? 'Free' : `₦${Number(order.delivery_fee).toLocaleString()}`}</div>
                  </div>
                </div>

                {/* Status message */}
                {order.status === 'pending' && !order.paystack_reference && (
                  <div style={{ margin: '0 24px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.6, marginBottom: 12 }}>
                    ⏳ Your payment receipt has been submitted. Our team will verify within 2 hours.
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  <button onClick={() => handleReorder(order)} disabled={reordering === order.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: reordering === order.id ? '#e5e7eb' : 'var(--black)', color: reordering === order.id ? '#9ca3af' : 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: reordering === order.id ? 'not-allowed' : 'pointer' }}>
                    <ShoppingCart size={14} />
                    {reordering === order.id ? 'Adding to cart...' : 'Reorder'}
                  </button>
                  <a href={`https://wa.me/2348052929523?text=Hello%2C%20I%20need%20help%20with%20order%20%23${order.job_number || order.id.slice(0,8).toUpperCase()}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#25D366', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    💬 Get help
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 600px) { .order-detail-grid { grid-template-columns: 1fr !important; } }` }} />
    </div>
  )
}