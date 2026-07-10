'use client'

import { useEffect, useState } from 'react'
import { useAdminOrdersStore } from '@/store/adminOrdersStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@/store/ordersStore'
import { RefreshCw, FileText, MessageSquare, CheckCircle, Image, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

const STATUSES: (OrderStatus | 'all')[] = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

function itemNeedsDesign(item: any): boolean {
  return item.has_own_design === false
}

const statusColor: Record<string, string> = {
  pending: '#f59e0b', paid: '#3b82f6', processing: '#8b5cf6',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444', refunded: '#6b7280',
}

function generateReceipt(order: any) {
  const receiptWindow = window.open('', '_blank')
  if (!receiptWindow) return
  const items = order.items || []
  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">${item.name}${item.specs ? `<br><small style="color:#888">${Object.entries(item.specs).map(([k,v]) => `${k}: ${v}`).join(' · ')}</small>` : ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity || 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right">₦${Number(item.price).toLocaleString()}</td>
    </tr>`).join('')
  receiptWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${order.job_number || order.id.slice(0,8).toUpperCase()}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1A1A1A;padding:40px;max-width:600px;margin:0 auto}
  .header{text-align:center;margin-bottom:32px;border-bottom:3px solid #C0392B;padding-bottom:20px}
  .logo{font-size:28px;font-weight:900;color:#C0392B}.company{font-size:13px;color:#666;margin-top:4px}
  .receipt-title{font-size:18px;font-weight:700;margin:24px 0 4px}.receipt-id{font-size:13px;color:#666}
  .section{margin:24px 0}.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.info-item label{font-size:11px;color:#999;display:block;margin-bottom:2px}
  .info-item span{font-size:14px;font-weight:500}table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#999;border-bottom:2px solid #eee}
  th:last-child,td:last-child{text-align:right}th:nth-child(2),td:nth-child(2){text-align:center}
  .total-row td{padding:14px 8px;font-weight:700;font-size:16px;background:#f9f9f9}
  .grand-total td{background:#C0392B;color:white;padding:14px 8px;font-size:18px;font-weight:900}
  .footer{margin-top:40px;text-align:center;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.8}
  .status{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;background:#dcfce7;color:#166534}
  @media print{body{padding:20px}}</style></head><body>
  <div class="header"><div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px">
  <img src="/C-Chu_media_Logo_.png" alt="" style="width:50px;height:50px;object-fit:contain">
  <div><div class="logo">PrintHub</div><div style="font-size:12px;color:#666;font-weight:600">by C-Chu Media Ltd</div></div></div>
  <div class="company">Suite 38, Mazfallah Shopping Complex, Karu, Abuja<br>Tel: +234 806 375 3209 · info@cchumedia.com</div></div>
  <div class="receipt-title">RECEIPT / INVOICE</div>
  <div class="receipt-id">Order #${order.job_number || order.id.slice(0,8).toUpperCase()} &nbsp;·&nbsp; ${new Date(order.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})} &nbsp;·&nbsp; <span class="status">${order.status.toUpperCase()}</span></div>
  <div class="section"><div class="section-title">Customer Details</div><div class="info-grid">
  <div class="info-item"><label>Name</label><span>${order.first_name} ${order.last_name}</span></div>
  <div class="info-item"><label>Phone</label><span>${order.phone||'—'}</span></div>
  <div class="info-item"><label>Email</label><span>${order.email}</span></div>
  <div class="info-item"><label>Delivery</label><span>${order.shipping_method==='pickup'?'Pickup from store':order.delivery_area||'Home delivery'}</span></div>
  ${order.address_line1?`<div class="info-item" style="grid-column:span 2"><label>Address</label><span>${order.address_line1}</span></div>`:''}</div></div>
  <div class="section"><div class="section-title">Order Items</div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>
  ${itemRows}
  <tr class="total-row"><td colspan="2" style="padding:14px 8px;font-weight:700">Subtotal</td><td style="padding:14px 8px;text-align:right;font-weight:700">₦${Number(order.subtotal).toLocaleString()}</td></tr>
  <tr class="total-row"><td colspan="2" style="padding:10px 8px">Delivery fee</td><td style="padding:10px 8px;text-align:right">${Number(order.delivery_fee)===0?'FREE':'₦'+Number(order.delivery_fee).toLocaleString()}</td></tr>
  </tbody><tfoot><tr class="grand-total"><td colspan="2">TOTAL</td><td>₦${Number(order.total_amount).toLocaleString()}</td></tr></tfoot></table></div>
  ${order.paystack_reference?`<div class="section"><div class="section-title">Payment Reference</div><div style="font-size:14px">${order.paystack_reference}</div></div>`:''}
  ${order.production_notes?`<div class="section"><div class="section-title">Production Notes</div><div style="font-size:13px;white-space:pre-line;color:#444">${order.production_notes}</div></div>`:''}
  <div class="footer"><p>Thank you for choosing PrintHub by C-Chu Media Limited.</p>
  <p>+234 805 292 9523 · info@cchumedia.com · printhub.cchumedia.com</p>
  <p style="margin-top:12px;font-style:italic">"Birthing your Imagination..."</p></div>
  <script>window.onload=function(){window.print()}</script></body></html>`)
  receiptWindow.document.close()
}

export default function AdminOrdersPage() {
  const { filteredOrders, fetchAllOrders, updateOrderStatus, addProductionNote, approveReceipt, setFilter, isLoading, filter } = useAdminOrdersStore()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)
  const [filterDesign, setFilterDesign] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      setIsAdmin(true)
      fetchAllOrders()
    }
    check()
  }, [])

  const handleSaveNote = async (orderId: string) => {
    const note = noteInput[orderId]?.trim()
    if (!note) return
    setSavingNote(orderId)
    await addProductionNote(orderId, note)
    setNoteInput(p => ({ ...p, [orderId]: '' }))
    setSavingNote(null)
  }

  if (!isAdmin) return null

  const pendingBankTransfers = filteredOrders.filter(o => o.status === 'pending' && !(o as any).receipt_verified && !(o as any).paystack_reference)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>All Orders</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>{filteredOrders.length} orders</p>
        </div>
        <button onClick={fetchAllOrders} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Bank transfer alert */}
      {pendingBankTransfers.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#d97706" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            {pendingBankTransfers.length} bank transfer order{pendingBankTransfers.length > 1 ? 's' : ''} awaiting receipt verification
          </span>
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === s ? (statusColor[s] || 'var(--red)') : 'var(--border)'}`, background: filter === s ? `${statusColor[s] || 'var(--red)'}15` : 'white', color: filter === s ? (statusColor[s] || 'var(--red)') : 'var(--gray)', fontSize: 13, fontWeight: filter === s ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', textTransform: 'capitalize' as const }}>
            {s}
          </button>
        ))}
      </div>

      {/* Design work queue filter */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setFilterDesign(f => !f)}
          style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filterDesign ? '#7c3aed' : 'var(--border)'}`, background: filterDesign ? '#ede9fe' : 'white', color: filterDesign ? '#7c3aed' : 'var(--gray)', fontSize: 13, fontWeight: filterDesign ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          🎨 Needs Design Work
        </button>
        {filterDesign && (
          <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 10 }}>
            Showing orders where customer requested design service
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--gray)' }}>Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16 }}>No orders found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {filteredOrders
            .filter(order => !filterDesign || (order.items || []).some((i: any) => itemNeedsDesign(i)))
            .map(order => {
            const isExpanded = expanded === order.id
            const isBankPending = order.status === 'pending' && !(order as any).paystack_reference && !(order as any).receipt_verified
            const designItems = (order.items || []).filter((i: any) => i.design_file_url || i.design_link || i.design_brief)
            const needsDesignCount = (order.items || []).filter((i: any) => itemNeedsDesign(i)).length

            return (
              <div key={order.id} style={{ background: 'white', border: `1px solid ${isBankPending ? '#fbbf24' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Order header row */}
                <div onClick={() => setExpanded(isExpanded ? null : order.id)}
                  style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexWrap: 'wrap' as const, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
                    <div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>#{order.job_number || order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>Customer</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{order.first_name} {order.last_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>Total</div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>₦{Number(order.total_amount).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>Items</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</div>
                    </div>
                    {needsDesignCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef3c7', borderRadius: 20, padding: '3px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>🎨 {needsDesignCount} needs design</span>
                      </div>
                    )}
                    {designItems.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ede9fe', borderRadius: 20, padding: '3px 10px' }}>
                        <Image size={12} color="#7c3aed" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>{designItems.length} design file{designItems.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {isBankPending && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef9c3', borderRadius: 20, padding: '3px 10px' }}>
                        <AlertCircle size={12} color="#d97706" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Awaiting receipt</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isBankPending && (
                      <button onClick={e => { e.stopPropagation(); approveReceipt(order.id) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                        <CheckCircle size={13} /> Approve Receipt
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); generateReceipt(order) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat', fontWeight: 600, flexShrink: 0 }}>
                      <FileText size={13} /> Receipt
                    </button>
                    <select value={order.status} onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateOrderStatus(order.id, e.target.value as OrderStatus) }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${statusColor[order.status]}`, background: `${statusColor[order.status]}15`, color: statusColor[order.status], fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer', outline: 'none' }}>
                      {STATUSES.filter(s => s !== 'all').map(s => (
                        <option key={s} value={s} style={{ background: 'white', color: '#1A1A1A' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    <span style={{ color: 'var(--gray)', fontSize: 18, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>⌄</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--light)' }}>

                    {/* Customer + order info grid */}
                    <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, borderBottom: '1px solid var(--border)' }} className="order-expand-grid">
                      {[
                        { label: 'Email', value: order.email },
                        { label: 'Phone', value: order.phone || '—' },
                        { label: 'Payment', value: order.paystack_reference ? `Paystack · ${order.paystack_reference}` : 'Bank Transfer' },
                        { label: 'Delivery', value: order.shipping_method === 'pickup' ? '🏪 Pickup' : order.delivery_area || 'Home delivery' },
                        { label: 'Address', value: order.address_line1 || '—' },
                        { label: 'State', value: order.state || '—' },
                        { label: 'Delivery Fee', value: `₦${Number(order.delivery_fee).toLocaleString()}` },
                        { label: 'Subtotal', value: `₦${Number(order.subtotal).toLocaleString()}` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Order items with design files */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Items & Artwork</div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                        {(order.items || []).map((item: any, idx: number) => (
                          <div key={idx} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' as const }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>{item.displayQty || `Qty: ${item.quantity || 1}`}</div>
                              {item.specs && Object.entries(item.specs).length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                                  {Object.entries(item.specs).map(([k, v]) => (
                                    <span key={k} style={{ fontSize: 11, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', color: '#555' }}>{k}: {String(v)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>₦{Number(item.price).toLocaleString()}</div>
                            {/* Design pricing details — from pre-cart DesignPricingFlow */}
                            {item.has_own_design !== null && item.has_own_design !== undefined && (
                              <div style={{ width: '100%', background: item.has_own_design ? '#f0fdf4' : '#fefce8', border: `1px solid ${item.has_own_design ? '#86efac' : '#fde68a'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: item.has_own_design ? '#166534' : '#92400e' }}>
                                  Design Details
                                </div>
                                {item.has_own_design ? (
                                  <div style={{ color: '#166534' }}>✓ Customer is supplying their own print-ready file</div>
                                ) : (
                                  <div style={{ color: '#92400e' }}>
                                    <div style={{ marginBottom: 4 }}>🎨 Customer requested design service</div>
                                    {item.design_units != null && (
                                      <div><strong>Units:</strong> {item.design_units}</div>
                                    )}
                                    {Array.isArray(item.design_addons_selected) && item.design_addons_selected.length > 0 && (
                                      <div style={{ marginTop: 4 }}>
                                        <strong>Add-ons:</strong>{' '}
                                        {item.design_addons_selected.map((a: any) => `${a.name} (₦${Number(a.price).toLocaleString()})`).join(', ')}
                                      </div>
                                    )}
                                    {item.design_cost_total > 0 && (
                                      <div style={{ marginTop: 6, fontFamily: 'Montserrat', fontWeight: 700 }}>
                                        Design total: ₦{Number(item.design_cost_total).toLocaleString()}
                                      </div>
                                    )}
                                    {item.design_request_notes && (
                                      <div style={{ marginTop: 6, background: 'white', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', fontStyle: 'italic', color: '#78350f' }}>
                                        Notes: {item.design_request_notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Design files — uploaded or linked after cart */}
                            <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                              {item.design_file_url && (
                                <a href={item.design_file_url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ede9fe', color: '#7c3aed', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>
                                  <Image size={12} /> View Design File
                                </a>
                              )}
                              {item.design_link && (
                                <a href={item.design_link} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>
                                  <ExternalLink size={12} /> Design Link
                                </a>
                              )}
                              {item.design_brief && (
                                <div style={{ width: '100%', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6b21a8' }}>
                                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Design Brief</div>
                                  {item.design_brief.businessName && <div><strong>Business:</strong> {item.design_brief.businessName}</div>}
                                  {item.design_brief.colors && <div><strong>Colors:</strong> {item.design_brief.colors}</div>}
                                  {item.design_brief.slogan && <div><strong>Slogan:</strong> {item.design_brief.slogan}</div>}
                                  {item.design_brief.notes && <div><strong>Notes:</strong> {item.design_brief.notes}</div>}
                                  {item.design_brief.referenceUrl && <a href={item.design_brief.referenceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>Reference →</a>}
                                </div>
                              )}
                              {item.has_own_design === null && !item.design_file_url && !item.design_link && !item.design_brief && (
                                <span style={{ fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>No design submitted yet</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bank transfer receipt */}
                    {order.receipt_url && (
                      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Bank Transfer Receipt</div>
                        <a href={order.receipt_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>
                          <ExternalLink size={12} /> View Receipt
                        </a>
                        {(order as any).receipt_verified ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                            <CheckCircle size={13} /> Verified {(order as any).verified_at ? `· ${new Date((order as any).verified_at).toLocaleDateString('en-NG')}` : ''}
                          </span>
                        ) : (
                          <button onClick={() => approveReceipt(order.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            <CheckCircle size={13} /> Approve & Mark Paid
                          </button>
                        )}
                      </div>
                    )}

                    {/* Production notes */}
                    <div style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={13} /> Production Notes
                      </div>
                      {(order as any).production_notes && (
                        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', fontSize: 12, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 10, fontFamily: 'monospace' }}>
                          {(order as any).production_notes}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={noteInput[order.id] || ''}
                          onChange={e => setNoteInput(p => ({ ...p, [order.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(order.id) } }}
                          placeholder="Add note — e.g. Using 440gsm matte, collected by GIG courier, tracking: GIG123456..."
                          className="form-input"
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button onClick={() => handleSaveNote(order.id)} disabled={savingNote === order.id || !noteInput[order.id]?.trim()}
                          style={{ padding: '10px 18px', background: !noteInput[order.id]?.trim() ? '#e5e7eb' : 'var(--red)', color: !noteInput[order.id]?.trim() ? '#9ca3af' : 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: !noteInput[order.id]?.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                          {savingNote === order.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 700px) { .order-expand-grid { grid-template-columns: repeat(2, 1fr) !important; } }` }} />
    </div>
  )
}