import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { reverseBooksForOrder } from '@/lib/books/fulfil'

// Called by the admin Orders screen after an order is set to refunded: withdraw ebook access and cancel
// out the royalty entries with negative ones. Admin only; the order must really be refunded. Safe to repeat.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const { orderId } = await req.json().catch(() => ({ orderId: '' }))
  if (typeof orderId !== 'string' || !orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const { data: order } = await auth.db.from('orders').select('id, status').eq('id', orderId).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'refunded') return NextResponse.json({ error: 'Order is not refunded' }, { status: 409 })
  const r = await reverseBooksForOrder(auth.db, orderId)
  return NextResponse.json(r)
}
