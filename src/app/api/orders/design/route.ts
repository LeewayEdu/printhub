import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { itemAwaitingDesign } from '@/lib/design-status'

// Attaches a design file or link to an order item AFTER the order exists (the customer pays first and
// uploads afterwards). Customers cannot write to order_items directly once the payment-integrity
// migration has run, so this goes through the server. Allowed for the order's owner or an admin.
// It only ever touches the design fields of an item; prices, status and payment are never changed here.
export async function POST(req: NextRequest) {
  const limit = rateLimit(`design:${clientIp(req.headers)}`, 40, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  const itemId = typeof body.itemId === 'string' ? body.itemId : ''
  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : ''
  const link = typeof body.link === 'string' ? body.link.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : ''
  if (!orderId || !itemId) return NextResponse.json({ error: 'Missing order or item' }, { status: 400 })
  if (!fileUrl && !link) return NextResponse.json({ error: 'Add a file or a link' }, { status: 400 })
  if (fileUrl && link) return NextResponse.json({ error: 'Send either a file or a link, not both' }, { status: 400 })

  // The file must be one uploaded to our own storage bucket; a link must be a plain web address
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (fileUrl && !(base && fileUrl.startsWith(`${base}/storage/v1/object/public/products/design-files/`))) {
    return NextResponse.json({ error: 'That file was not uploaded through the site' }, { status: 400 })
  }
  if (link) {
    try { const u = new URL(link); if (!/^https?:$/.test(u.protocol) || link.length > 1000) throw new Error() }
    catch { return NextResponse.json({ error: 'Please enter a valid link starting with https://' }, { status: 400 }) }
  }

  const { data: order } = await db.from('orders').select('id, user_id, status').eq('id', orderId).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.user_id !== user.id) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (['cancelled', 'refunded'].includes(order.status)) return NextResponse.json({ error: 'This order is closed' }, { status: 409 })

  const { data: item } = await db.from('order_items')
    .select('id, order_id, has_own_design, design_file_url, design_link').eq('id', itemId).eq('order_id', orderId).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Item not found on this order' }, { status: 404 })
  if (item.has_own_design === false) return NextResponse.json({ error: 'This item is being designed by PrintHub' }, { status: 409 })

  const { error } = await db.from('order_items').update({
    design_type: fileUrl ? 'upload' : 'link',
    design_file_url: fileUrl || null,
    design_link: link || null,
    ...(notes ? { design_brief: { notes } } : {}),
  }).eq('id', itemId).eq('order_id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: all } = await db.from('order_items').select('has_own_design, design_file_url, design_link').eq('order_id', orderId)
  return NextResponse.json({ ok: true, stillAwaiting: (all || []).some(itemAwaitingDesign), wasAwaiting: itemAwaitingDesign(item) })
}
