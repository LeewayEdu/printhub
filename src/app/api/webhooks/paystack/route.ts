import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { confirmOrderPayment } from '@/lib/paystack'

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

      // ── 8. Affiliate commission ───────────────────────────────
      const customerId = order.user_id
      try {
        if (customerId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', customerId)
            .single()

          if (profile?.referred_by) {
            // FK column may be user_id or profile_id depending on when the DB was set up
            let affiliate: any = null
            const { data: a1 } = await supabase
              .from('affiliates')
              .select('id, total_earnings, pending_payout')
              .eq('user_id', profile.referred_by)
              .single()
            affiliate = a1
            if (!affiliate) {
              const { data: a2 } = await supabase
                .from('affiliates')
                .select('id, total_earnings, pending_payout')
                .eq('profile_id', profile.referred_by)
                .single()
              affiliate = a2
            }

            if (affiliate) {
              // Count prior orders from this customer already attributed to this affiliate
              const { count: priorCount } = await supabase
                .from('commissions')
                .select('id', { count: 'exact', head: true })
                .eq('affiliate_id', affiliate.id)
                .eq('referred_customer', customerId)

              const prior = priorCount ?? 0
              const rate = prior < 5 ? 0.10 : prior < 10 ? 0.05 : 0.03
              const commissionAmount = Math.round(amountNaira * rate * 100) / 100

              await supabase.from('commissions').insert({
                affiliate_id: affiliate.id,
                order_id: order.id,
                referred_customer: customerId,
                order_total: amountNaira,
                rate,
                amount: commissionAmount,
                status: 'pending',
              })

              await supabase
                .from('affiliates')
                .update({
                  total_earnings: (Number(affiliate.total_earnings) || 0) + commissionAmount,
                  pending_payout: (Number(affiliate.pending_payout) || 0) + commissionAmount,
                })
                .eq('id', affiliate.id)

              // Update referrals row if it exists
              const { data: refRow } = await supabase
                .from('referrals')
                .select('total_orders, total_spent, total_commission')
                .eq('affiliate_id', affiliate.id)
                .eq('profile_id', customerId)
                .single()

              if (refRow) {
                await supabase
                  .from('referrals')
                  .update({
                    total_orders: (refRow.total_orders || 0) + 1,
                    total_spent: (Number(refRow.total_spent) || 0) + amountNaira,
                    total_commission: (Number(refRow.total_commission) || 0) + commissionAmount,
                  })
                  .eq('affiliate_id', affiliate.id)
                  .eq('profile_id', customerId)
              }

              console.log(`✅ Commission ₦${commissionAmount} (${(rate * 100).toFixed(0)}%) created for affiliate ${affiliate.id}`)
            }
          }
        }
      } catch (commErr: any) {
        // Non-critical — order is already confirmed, commission can be fixed manually
        console.error('Commission processing failed:', commErr.message)
      }

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