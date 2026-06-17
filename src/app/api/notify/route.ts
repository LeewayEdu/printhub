import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── Send the WhatsApp order alert via UltraMsg, AWAITED with real
// status checking — the previous version fired fetch() without await
// and without checking the HTTP response, so an expired token, wrong
// phone format, or rate limit would fail completely silently. This
// version returns a clear success/failure result that gets logged AND
// returned in the API response, so failures are actually visible.
async function sendWhatsAppAlert(message: string): Promise<{ ok: boolean; provider: string | null; detail: string }> {
  const notifyPhone = process.env.NOTIFY_PHONE
  if (!notifyPhone) {
    return { ok: false, provider: null, detail: 'NOTIFY_PHONE is not set in environment variables.' }
  }

  const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID
  const ultraToken = process.env.ULTRAMSG_TOKEN

  if (ultraInstance && ultraToken) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: ultraToken,
          to: `+${notifyPhone}`,
          body: message,
        }).toString(),
      })
      const body = await res.text()
      if (!res.ok) {
        // UltraMsg returned an HTTP error (expired token, bad instance ID,
        // rate limit, etc.) — fetch() does NOT throw on this, so this check
        // is the only thing that catches it.
        return { ok: false, provider: 'ultramsg', detail: `UltraMsg HTTP ${res.status}: ${body.slice(0, 300)}` }
      }
      // UltraMsg can return 200 with an error payload (e.g. invalid token,
      // instance disconnected) — check the parsed body for that too.
      try {
        const parsed = JSON.parse(body)
        if (parsed.error || parsed.sent === false) {
          return { ok: false, provider: 'ultramsg', detail: `UltraMsg rejected: ${JSON.stringify(parsed).slice(0, 300)}` }
        }
      } catch {
        // Non-JSON 200 response — treat as success if status was OK
      }
      return { ok: true, provider: 'ultramsg', detail: 'Sent successfully' }
    } catch (e: any) {
      return { ok: false, provider: 'ultramsg', detail: `UltraMsg network error: ${e?.message || String(e)}` }
    }
  }

  if (process.env.CALLMEBOT_API_KEY) {
    try {
      const encoded = encodeURIComponent(message)
      const res = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${notifyPhone}&text=${encoded}&apikey=${process.env.CALLMEBOT_API_KEY}`)
      const body = await res.text()
      if (!res.ok) {
        return { ok: false, provider: 'callmebot', detail: `CallMeBot HTTP ${res.status}: ${body.slice(0, 300)}` }
      }
      return { ok: true, provider: 'callmebot', detail: 'Sent successfully' }
    } catch (e: any) {
      return { ok: false, provider: 'callmebot', detail: `CallMeBot network error: ${e?.message || String(e)}` }
    }
  }

  return { ok: false, provider: null, detail: 'No WhatsApp provider configured — set ULTRAMSG_INSTANCE_ID + ULTRAMSG_TOKEN, or CALLMEBOT_API_KEY.' }
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, customerName, customerEmail, customerPhone, total, items, itemsArr, subtotal, deliveryFee, deliveryArea, address, paymentMethod, paystackRef } = await req.json()

    // ── WhatsApp notification — currently disabled while a provider
    // decision is pending (UltraMsg renewal vs Meta Cloud API). Email is
    // the primary notification channel for now. If no provider is
    // configured, this skips silently rather than logging a "failure" —
    // there's nothing wrong, WhatsApp is just intentionally not wired up
    // yet. Once a provider is chosen, sendWhatsAppAlert() just needs its
    // env vars set and this will start working automatically with no
    // code changes here.
    const waMessage = `🛒 NEW ORDER on PrintHub!\n\nOrder: #${orderId}\nCustomer: ${customerName}\nTotal: ₦${Number(total).toLocaleString()}\nItems: ${items}\n\nDashboard: https://printhub.cchumedia.com/dashboard/admin/orders`
    const waConfigured = !!(process.env.NOTIFY_PHONE && (
      (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) ||
      process.env.CALLMEBOT_API_KEY
    ))
    const waResult = waConfigured
      ? await sendWhatsAppAlert(waMessage)
      : { ok: false, provider: null, detail: 'WhatsApp not configured yet — email is the active notification channel.' }
    if (waConfigured && !waResult.ok) {
      console.error(`[notify] WhatsApp alert FAILED for order #${orderId} — provider: ${waResult.provider || 'none'} — ${waResult.detail}`)
    } else if (waConfigured) {
      console.log(`[notify] WhatsApp alert sent for order #${orderId} via ${waResult.provider}`)
    }
    // (no log line at all when waConfigured is false — this is expected, not an error)

    // ── Email via Resend (ADMIN notification — this is now the PRIMARY
    // order alert channel while WhatsApp is pending. Gated only on
    // RESEND_API_KEY, NOT on customerEmail — previously this shared a
    // condition with the customer confirmation email, meaning if a
    // customer ever checked out without an email on file, the admin
    // alert would also silently never fire. Since this is the channel
    // you're relying on to know an order happened, it must not depend
    // on anything about the customer's own contact info.
    let adminEmailOk = true
    let adminEmailError: string | null = null
    if (process.env.RESEND_API_KEY) {
      const itemsHtml = (itemsArr || []).map((item: any) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2C2C2C">
            ${item.name}${item.displayQty ? ` <span style="color:#6B6B6B">(${item.displayQty})</span>` : ''}
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:700">
            ₦${Number(item.price).toLocaleString()}
          </td>
        </tr>`).join('')

      const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#C0392B;padding:28px 32px">
      <div style="font-weight:900;font-size:22px;color:white">📦 New PrintHub Order</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">Order #${orderId} has just been placed</div>
    </div>
    <div style="padding:24px 32px;border-bottom:1px solid #F0F0F0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Customer Details</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B;width:130px">Name</td><td style="padding:5px 0;font-size:13px;font-weight:600">${customerName}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B">Email</td><td style="padding:5px 0;font-size:13px">${customerEmail || '—'}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B">Phone</td><td style="padding:5px 0;font-size:13px">${customerPhone || '—'}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B">Delivery</td><td style="padding:5px 0;font-size:13px">${deliveryArea || '—'}${address ? ' — ' + address : ''}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B">Payment</td><td style="padding:5px 0;font-size:13px">${paymentMethod === 'paystack' ? '💳 Paystack' : '🏦 Bank Transfer'}${paystackRef ? ' (' + paystackRef + ')' : ''}</td></tr>
      </table>
    </div>
    <div style="padding:24px 32px;border-bottom:1px solid #F0F0F0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Items Ordered</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F7F7F5"><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6B6B6B;text-align:left;text-transform:uppercase">Product</th><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6B6B6B;text-align:right;text-transform:uppercase">Amount</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
    <div style="padding:20px 32px;border-bottom:1px solid #F0F0F0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B">Subtotal</td><td style="padding:4px 0;font-size:13px;text-align:right">₦${Number(subtotal || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B">Delivery fee</td><td style="padding:4px 0;font-size:13px;text-align:right">₦${Number(deliveryFee || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:10px 0 4px;font-size:15px;font-weight:700;border-top:2px solid #F0F0F0">Total Paid</td><td style="padding:10px 0 4px;font-size:20px;font-weight:900;color:#C0392B;text-align:right;border-top:2px solid #F0F0F0">₦${Number(total).toLocaleString()}</td></tr>
      </table>
    </div>
    <div style="padding:24px 32px;text-align:center">
      <a href="https://printhub.cchumedia.com/dashboard/admin/orders" style="display:inline-block;background:#C0392B;color:white;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none">View Order in Dashboard →</a>
    </div>
    <div style="padding:16px 32px;background:#F7F7F5;text-align:center;font-size:11px;color:#6B6B6B">
      PrintHub by C-Chu Media Limited · Suite 38, Mazfallah Shopping Complex, Karu, Abuja
    </div>
  </div>
</body>
</html>`

      try {
        const sendResult = await resend.emails.send({
          from: 'PrintHub Orders <orders@cchumedia.com>',
          to: 'info@cchumedia.com',
          subject: `🛒 New Order #${orderId} — ₦${Number(total).toLocaleString()} (${paymentMethod === 'paystack' ? 'Paid' : 'Bank Transfer'})`,
          html,
        })
        if (sendResult.error) {
          adminEmailOk = false
          adminEmailError = JSON.stringify(sendResult.error)
          console.error(`[notify] Admin email FAILED for order #${orderId}:`, adminEmailError)
        }
      } catch (e: any) {
        adminEmailOk = false
        adminEmailError = e?.message || String(e)
        console.error(`[notify] Admin email threw for order #${orderId}:`, adminEmailError)
      }
    }

    // ── Customer order confirmation email ────────────────────
    let customerEmailOk = true
    let customerEmailError: string | null = null
    if (process.env.RESEND_API_KEY && customerEmail) {
      const confirmHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#C0392B;padding:28px 32px;text-align:center">
      <div style="font-weight:900;font-size:26px;color:white;letter-spacing:-1px">PrintHub</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">by C-Chu Media Limited</div>
    </div>
    <div style="padding:32px">
      <div style="font-size:22px;font-weight:800;color:#1A1A1A;margin-bottom:8px">Order confirmed! 🎉</div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px">
        Hi ${customerName}, thank you for your order. We have received it and our team will begin processing shortly.
      </p>
      <div style="background:#F7F7F5;border-radius:10px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#666">Order ID</span>
          <span style="font-size:13px;font-weight:700;color:#1A1A1A">#${orderId}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#666">Items</span>
          <span style="font-size:13px;color:#1A1A1A">${items}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #e5e7eb;margin-top:8px">
          <span style="font-size:15px;font-weight:700;color:#1A1A1A">Total</span>
          <span style="font-size:18px;font-weight:900;color:#C0392B">₦${Number(total).toLocaleString()}</span>
        </div>
      </div>
      ${paymentMethod === 'bank' ? `
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin-bottom:24px;font-size:13px;color:#92400e;line-height:1.6">
        <strong>Bank transfer order:</strong> Please send your payment receipt to our WhatsApp (+234 805 292 9523) if you haven't already. Your order will be confirmed once payment is verified (within 2 hours).
      </div>` : ''}
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://printhub.cchumedia.com/dashboard/orders" style="display:inline-block;background:#C0392B;color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:9px;text-decoration:none">Track Your Order →</a>
      </div>
      <p style="font-size:13px;color:#888;line-height:1.7;text-align:center">
        Questions? WhatsApp us at <a href="https://wa.me/2348052929523" style="color:#C0392B;text-decoration:none">+234 805 292 9523</a> or email <a href="mailto:info@cchumedia.com" style="color:#C0392B;text-decoration:none">info@cchumedia.com</a>
      </p>
    </div>
    <div style="padding:16px 32px;background:#F7F7F5;text-align:center;font-size:11px;color:#999">
      Suite 38, Mazfallah Shopping Complex, Karu, Abuja · Mon–Sat 8AM–7PM
    </div>
  </div>
</body>
</html>`

      try {
        const sendResult = await resend.emails.send({
          from: 'PrintHub <orders@cchumedia.com>',
          to: customerEmail,
          subject: `✅ Order Confirmed — #${orderId} · ₦${Number(total).toLocaleString()}`,
          html: confirmHtml,
        })
        if (sendResult.error) {
          customerEmailOk = false
          customerEmailError = JSON.stringify(sendResult.error)
          console.error(`[notify] Customer email FAILED for order #${orderId}:`, customerEmailError)
        }
      } catch (e: any) {
        customerEmailOk = false
        customerEmailError = e?.message || String(e)
        console.error(`[notify] Customer email threw for order #${orderId}:`, customerEmailError)
      }
    }

    // Return real status for every channel — previously this always
    // returned { success: true } regardless of what actually happened.
    return NextResponse.json({
      success: true, // the route itself didn't crash
      whatsapp: { ok: waResult.ok, provider: waResult.provider, detail: waResult.ok ? undefined : waResult.detail },
      adminEmail: { ok: adminEmailOk, error: adminEmailError || undefined },
      customerEmail: { ok: customerEmailOk, error: customerEmailError || undefined },
    })
  } catch (error: any) {
    console.error('[notify] Route-level error:', error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 })
  }
}