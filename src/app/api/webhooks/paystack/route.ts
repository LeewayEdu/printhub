import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { confirmOrderPayment } from '@/lib/paystack'
import { alertPaymentReview } from '@/lib/alerts'

// Use service role key — this runs server-side only, never exposed to client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // ── 1. Verify webhook signature ───────────────────────────
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY not set')
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid Paystack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // ── 2. Parse event ────────────────────────────────────────
    const event = JSON.parse(body)
    console.log('Paystack webhook event:', event.event)

    // ── 3. Handle charge.success ──────────────────────────────
    if (event.event === 'charge.success') {
      const data = event.data
      const reference = data.reference
      const amountKobo = data.amount
      const amountNaira = amountKobo / 100
      const customerEmail = data.customer?.email
      const status = data.status // should be 'success'

      if (status !== 'success') {
        return NextResponse.json({ received: true })
      }

      // ── 4-7. Confirm through the shared server routine (checks reference, amount and
      //         currency, idempotent). The browser can no longer mark orders paid, so a
      //         webhook finding an order still 'pending' is the normal case.
      const result = await confirmOrderPayment(supabase, {
        reference, status, amountKobo, currency: String(data.currency || ''),
      })
      if (result.state === 'amount_mismatch' && result.review?.firstTime && result.order) {
        await alertPaymentReview({ orderId: result.order.id, reference, ...result.review })
      }
      if (result.state === 'order_not_found') {
        // The order may not exist yet (the browser creates it after the popup); the verify route
        // will confirm it then.
        console.error('Order not found for reference:', reference)
        return NextResponse.json({ received: true })
      }
      if (result.state !== 'paid' || !result.order) {
        console.log(`Webhook for ${reference}: ${result.state}`)
        return NextResponse.json({ received: true })
      }
      const order = result.order

      console.log(`✅ Order ${order.id} confirmed as paid via webhook. Ref: ${reference}`)

      // Affiliate commission is NOT paid here any more: it is earned when the order is marked
      // delivered (lib/commissions.ts), for card and bank-transfer orders alike.

      // ── 9. Send confirmation notifications ───────────────────
      try {
        const { data: items } = await supabase
          .from('order_items')
          .select('name, display_qty, price')
          .eq('order_id', order.id)

        const itemNames = items?.map(i => `${i.name} (${i.display_qty || '1 pcs'})`).join(', ') || ''

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id.slice(0, 8).toUpperCase(),
            customerName: `${order.first_name} ${order.last_name}`,
            customerEmail: order.email,
            total: amountNaira,
            items: itemNames,
            paymentMethod: 'paystack',
            paystackRef: reference,
            webhookConfirmed: true,
          })
        })
      } catch (notifyErr) {
        // Non-critical — order is already confirmed, just log
        console.error('Notification failed after webhook:', notifyErr)
      }
    }

    // ── 9. Handle refund event ────────────────────────────────
    if (event.event === 'refund.processed') {
      const reference = event.data.transaction_reference
      await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('paystack_reference', reference)
      console.log('Order refunded:', reference)
    }

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('Webhook error:', err.message)
    // Always return 200 — if we return 4xx/5xx Paystack will retry
    return NextResponse.json({ received: true })
  }
}

// Paystack sends POST only — reject everything else
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}