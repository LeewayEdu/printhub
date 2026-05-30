import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { orderId, customerName, customerEmail, customerPhone, total, items, itemsArr, subtotal, deliveryFee, deliveryArea, address, paymentMethod, paystackRef } = await req.json()

    // ── WhatsApp notification ───────────────────────────────
    // Supports two providers — set whichever you have credentials for:
    //
    // Option A: UltraMsg (recommended — ultramsg.com, free 500 msgs/month)
    //   ULTRAMSG_INSTANCE_ID=xxxxx
    //   ULTRAMSG_TOKEN=xxxxxxxxxx
    //   NOTIFY_PHONE=2348052929523  (international format, no +)
    //
    // Option B: CallMeBot (free but requires manual WhatsApp activation)
    //   CALLMEBOT_API_KEY=xxxxxxxx
    //   NOTIFY_PHONE=2348052929523

    const notifyPhone = process.env.NOTIFY_PHONE
    const waMessage = `🛒 NEW ORDER on PrintHub!\n\nOrder: #${orderId}\nCustomer: ${customerName}\nTotal: ₦${Number(total).toLocaleString()}\nItems: ${items}\n\nDashboard: https://printhub.cchumedia.com/dashboard/admin/orders`

    if (notifyPhone) {
      // Try UltraMsg first
      const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID
      const ultraToken = process.env.ULTRAMSG_TOKEN
      if (ultraInstance && ultraToken) {
        fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: ultraToken,
            to: `+${notifyPhone}`,
            body: waMessage,
          }).toString(),
        }).catch(e => console.error('UltraMsg error:', e))
      }
      // Try CallMeBot as fallback
      else if (process.env.CALLMEBOT_API_KEY) {
        const encoded = encodeURIComponent(waMessage)
        fetch(`https://api.callmebot.com/whatsapp.php?phone=${notifyPhone}&text=${encoded}&apikey=${process.env.CALLMEBOT_API_KEY}`)
          .catch(e => console.error('CallMeBot error:', e))
      }
    }

    // ── Email via Resend ────────────────────────────────────
    if (process.env.RESEND_API_KEY && customerEmail) {
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
        <tr><td style="padding:5px 0;font-size:12px;color:#6B6B6B">Email</td><td style="padding:5px 0;font-size:13px">${customerEmail}</td></tr>
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

      await resend.emails.send({
        from: 'PrintHub Orders <orders@cchumedia.com>',
        to: 'info@cchumedia.com',
        subject: `🛒 New Order #${orderId} — ₦${Number(total).toLocaleString()} (${paymentMethod === 'paystack' ? 'Paid' : 'Bank Transfer'})`,
        html,
      })
    }

    // ── Customer order confirmation email ────────────────────
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

      await resend.emails.send({
        from: 'PrintHub <orders@cchumedia.com>',
        to: customerEmail,
        subject: `✅ Order Confirmed — #${orderId} · ₦${Number(total).toLocaleString()}`,
        html: confirmHtml,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notify error:', error)
    return NextResponse.json({ success: false })
  }
}