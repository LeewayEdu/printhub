import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { priceOrder } from '@/lib/order-pricing'
import { withOptionalColumns } from '@/lib/order-columns'

// Creates an order on the server. The order is ALWAYS saved as 'pending': the only code that
// can mark a Paystack order paid is lib/paystack.ts (after Paystack confirms the payment), and
// a bank-transfer order becomes paid only when an admin approves the receipt. Once the database
// policies are tightened (see payment-integrity-migration.sql) customers cannot write to
// `orders` directly at all.

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : NaN)

// An order line for a book: priced by the server from book_formats, no design file, no product id
function bookRow(orderId: string, b: { bookId: string; formatId: string; type: string; title: string; quantity: number; total: number }) {
  return {
    order_id: orderId, product_id: null, name: `${b.title} (${b.type === 'ebook' ? 'Ebook' : b.type === 'print' ? 'Print' : 'Print + Ebook bundle'})`,
    price: b.total, quantity: b.quantity, specs: { Format: b.type }, design_type: null, design_file_url: null, design_link: null,
    design_brief: null, has_own_design: null, design_addons_selected: null, design_units: null, design_cost_total: 0, design_request_notes: null,
    item_type: 'book', book_id: b.bookId, book_format_id: b.formatId,
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`order:${clientIp(req.headers)}`, 30, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return NextResponse.json({ error: 'Cart is empty or invalid' }, { status: 400 })
  }

  const method = body.paymentMethod === 'bank' ? 'bank' : 'paystack'
  const reference = method === 'paystack' ? str(body.paystackReference, 100) : ''
  if (method === 'paystack' && !/^[A-Za-z0-9_.=-]{6,100}$/.test(reference)) {
    return NextResponse.json({ error: 'Missing or invalid payment reference' }, { status: 400 })
  }
  // A reference can belong to one order only
  if (reference) {
    const { data: existing } = await db.from('orders').select('id').eq('paystack_reference', reference).limit(1)
    if (existing && existing.length) return NextResponse.json({ error: 'Payment reference already used' }, { status: 409 })
  }

  // Recompute every price from the database. The browser's numbers are only compared, never stored.
  const priced = await priceOrder(db, body)
  if (!priced.ok) {
    console.error('[orders/create] rejected:', priced.error, JSON.stringify(priced.lines || priced.detail || ''))
    const message = priced.error === 'price_mismatch'
      ? 'Some prices changed since you added them to your cart. Please refresh your cart and try again.'
      : (priced.detail || 'Order could not be verified')
    return NextResponse.json({ error: message, code: priced.error }, { status: priced.error === 'pricing_unavailable' ? 503 : 400 })
  }
  const { subtotal, deliveryFee, total } = priced
  if (total <= 0) return NextResponse.json({ error: 'Invalid amounts' }, { status: 400 })

  // Books: the server decides the currency and what the order is made of (see lib/books)
  const hasBooks = priced.bookLines.length > 0
  const digitalOnly = hasBooks && body.items.every((i: any) => i?.kind === 'book') && priced.bookLines.every(b => b.type === 'ebook')
  let authorRef: string | null = null
  if (hasBooks && typeof body.authorRef === 'string' && /^[A-Za-z0-9_-]{2,40}$/.test(body.authorRef)) {
    const { data: a } = await db.from('authors').select('referral_code').ilike('referral_code', body.authorRef).maybeSingle()
    authorRef = a?.referral_code || null
  }

  const c = body.customer || {}
  const d = body.delivery || {}
  const { data: order, error } = await withOptionalColumns(inc => db.from('orders').insert({
    user_id: user.id,                       // taken from the verified session, never from the request
    first_name: str(c.firstName, 80), last_name: str(c.lastName, 80), email: str(c.email, 160), phone: str(c.phone, 40),
    shipping_method: digitalOnly || d.type === 'pickup' ? 'pickup' : 'home',
    address_line1: digitalOnly ? '' : str(d.address, 300),
    state: digitalOnly ? '' : str(d.state, 60),
    delivery_area: digitalOnly ? 'Digital (no delivery)' : (priced.delivery?.name || str(d.area, 120)),
    subtotal, delivery_fee: deliveryFee, total_amount: total,
    status: 'pending',
    paystack_reference: reference || null,
    receipt_url: method === 'bank' ? str(body.receiptUrl, 500) || null : null,
    ...(inc ? { payment_method: method } : {}),   // column added by payment-fields-migration.sql
    ...(hasBooks ? { currency: priced.currency, author_ref_code: authorRef } : {}),   // columns added by books-migration.sql
  }).select().single())
  if (error || !order) return NextResponse.json({ error: error?.message || 'Could not create order' }, { status: 500 })

  const rows = body.items.map((i: any, idx: number) => i?.kind === 'book' ? bookRow(order.id, priced.bookLines.find(b => b.index === idx)!) : ({
    order_id: order.id,
    product_id: str(i.productId, 60),
    name: str(i.name, 200),
    price: priced.linePrices[idx],          // the server's price, not the browser's
    quantity: 1,
    specs: i.specs && typeof i.specs === 'object' ? i.specs : {},
    design_type: i.design?.type || null,
    design_file_url: i.design?.fileUrl || null,
    design_link: i.design?.link || null,
    design_brief: i.design?.brief || null,
    has_own_design: i.designPricing?.hasOwnDesign ?? null,
    design_addons_selected: i.designPricing?.designAddons?.length ? i.designPricing.designAddons : null,
    design_units: i.designPricing?.designUnits ?? null,
    design_cost_total: i.designPricing?.hasOwnDesign ? 0 : num(i.designPricing?.designCostTotal) || 0,
    design_request_notes: i.designPricing?.designRequestNotes ?? null,
    ...(hasBooks ? { item_type: 'product', book_id: null, book_format_id: null } : {}),   // same keys on every row of a bulk insert
  }))
  const { error: itemsErr } = await db.from('order_items').insert(rows)
  if (itemsErr) {
    await db.from('orders').delete().eq('id', order.id)   // never leave an order without its items
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }
  return NextResponse.json({ order })
}
